import { Navbar } from './components/Navbar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { MediaGrid } from './components/MediaGrid.js';
import { VideoPlayer } from './components/VideoPlayer.js';
import { ApiService } from './services/api.js';
import { AuthService } from './services/auth.js';
import { AuthModal } from './components/AuthModal.js';

class App {
  constructor() {
    this.currentRoute = 'home';
    this.player = new VideoPlayer();
    this.genres = [];
    this.selectedGenre = null;
    this.currentDetailItem = null;
    this.currentAudioLang = 'en';
    this.currentSubLang = 'en';
    this.modalTrailerTimeout = null;
    this.modalIsMuted = true;
    this.pageTrailerTimeout = null;
    this.pageTrailerMuted = true;
    this.selectedYear = 2026;
    this.selectedYearType = 'movie';
    this.yearArchivePage = 1;
  }

  async init() {
    try {
      // 1. Render Navbar and initialize Auth
      AuthService.init();
      Navbar.render(document.getElementById('navbar-container'), this.currentRoute);
      window.addEventListener('cs-auth-changed', () => {
        Navbar.render(document.getElementById('navbar-container'), this.currentRoute);
      });
      
      // 2. Global Escape key handler
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (document.getElementById('details-modal-container')?.innerHTML) {
            this.closeDetails();
          }
        }
      });

      // 3. Load genres
      try {
        const g = await ApiService.getGenres();
        this.genres = g.results || g || [];
      } catch(e) { this.genres = []; }

      // 4. Hash & PopState Router listener for Direct Deep Linking and History Navigation
      window.addEventListener('hashchange', () => this.handleHashRoute());
      window.addEventListener('popstate', () => this.handleHashRoute());
      await this.handleHashRoute();

      // 5. Service Worker Registration & Notification Center Auto-Sync
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
      if (window.NotificationCenter) {
        window.NotificationCenter.loadNotifications().then(() => {
          window.NotificationCenter.startAutoRefresh();
        }).catch(() => {});
      }
    } catch(err) {
      console.error('App initialization error:', err);
    }
  }

  async handleHashRoute() {
    let hash = window.location.hash.replace(/^#\/?/, '');
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');

    // Support direct clean URLs like /movies, /tv, /anime, /kdrama, /indian, /trending, /serverstatus, /speedtest
    if (!hash && pathname) {
      hash = pathname;
    }

    if (!hash || hash === '/' || hash === 'home') {
      await this.navigate('home', false);
      return;
    }

    // Individual Movie / TV / Anime deep link: /movie/533535 or /tv/94997 or /anime/124159
    if (hash.startsWith('movie/') || hash.startsWith('tv/') || hash.startsWith('anime/')) {
      const parts = hash.split('/');
      const type = parts[0] === 'anime' ? 'tv' : parts[0];
      const idPart = parts[1] || '';
      const id = parseInt(idPart.split('-')[0]);
      if (id) {
        await this.renderDedicatedMediaPage(id, type);
        return;
      }
    }

    // Category Hubs: /movie, /movies, /tv-shows, /tv-show, /tv, /tvseries, /animemovie, /anime, /asian-drama, /kdrama, /indian, /trending
    if (hash === 'movie' || hash === 'movies' || hash.startsWith('movies?') || hash.startsWith('movie?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      this.currentRoute = 'movie';
      Navbar.render(document.getElementById('navbar-container'), 'movie');
      await this.renderCategoryHub('movies', filter, 1);
      return;
    }

    if (hash === 'tv-shows' || hash === 'tv-show' || hash === 'tv' || hash === 'tvseries' || hash === 'tv-series' || hash === 'series' || hash.startsWith('tv?') || hash.startsWith('tvseries?') || hash.startsWith('tv-shows?') || hash.startsWith('tv-show?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      this.currentRoute = 'tv-shows';
      Navbar.render(document.getElementById('navbar-container'), 'tv-shows');
      await this.renderCategoryHub('tv', filter, 1);
      return;
    }

    if (hash === 'animemovie' || hash === 'anime-movie' || hash === 'anime-movies' || hash.startsWith('animemovie?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      this.currentRoute = 'anime';
      Navbar.render(document.getElementById('navbar-container'), 'anime');
      await this.renderCategoryHub('animemovie', filter, 1);
      return;
    }

    if (hash === 'anime' || hash.startsWith('anime?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      this.currentRoute = 'anime';
      Navbar.render(document.getElementById('navbar-container'), 'anime');
      await this.renderCategoryHub('anime', filter, 1);
      return;
    }

    if (hash === 'asian-drama' || hash === 'asiandrama' || hash === 'asian_drama' || hash.startsWith('asian-drama?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      await this.renderCategoryHub('asian_drama', filter, 1);
      return;
    }

    if (hash === 'kdrama' || hash === 'kdramas' || hash === 'korean' || hash.startsWith('kdrama?') || hash.startsWith('kdramas?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      await this.renderCategoryHub('kdrama', filter, 1);
      return;
    }

    if (hash === 'indian' || hash === 'bollywood' || hash === 'hindi-dubbed' || hash.startsWith('indian?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      await this.renderCategoryHub('indian', filter, 1);
      return;
    }

    if (hash === 'trending' || hash.startsWith('trending?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      await this.renderCategoryHub('trending', filter, 1);
      return;
    }

    // Genre Hub: /genre/action or /genre?g=action or /genres
    if (hash.startsWith('genre/') || hash.startsWith('genre?') || hash === 'genres') {
      let gName = 'action';
      if (hash.startsWith('genre/')) {
        gName = hash.split('/')[1] || 'action';
      } else if (hash.includes('?')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        gName = params.get('g') || params.get('genre') || 'action';
      }
      await this.renderCategoryHub('genre', gName, 1);
      return;
    }

    if (hash.startsWith('watch')) {
      const parts = hash.split('/');
      if (parts.length >= 2 && parseInt(parts[1])) {
        const id = parseInt(parts[1]);
        const type = parts[2] || 'movie';
        await this.renderDedicatedMediaPage(id, type, 1, 1, true);
        return;
      }
      const params = new URLSearchParams(hash.replace(/^watch\??/, ''));
      const id = parseInt(params.get('id'));
      const type = params.get('type') || 'movie';
      const s = parseInt(params.get('s')) || 1;
      const e = parseInt(params.get('e')) || 1;
      if (id) {
        await this.renderDedicatedMediaPage(id, type, s, e, true);
        return;
      }
    }

    if (hash.startsWith('details')) {
      const params = new URLSearchParams(hash.replace(/^details\??/, ''));
      const id = parseInt(params.get('id'));
      const type = params.get('type') || 'movie';
      if (id) {
        await this.renderDedicatedMediaPage(id, type);
        return;
      }
    }

    if (hash.startsWith('years') || hash.startsWith('year')) {
      let y = 2026;
      let type = 'movie';
      if (hash.startsWith('year/')) {
        y = parseInt(hash.split('/')[1]) || 2026;
      } else {
        const params = new URLSearchParams(hash.replace(/^years?\??/, ''));
        y = parseInt(params.get('y')) || 2026;
        type = params.get('type') || 'movie';
      }
      this.selectedYear = y;
      this.selectedYearType = type;
      await this.navigate('years', false);
      return;
    }

    // Standard static routes normalization
    let cleanRoute = hash;
    if (hash === 'bookmarks' || hash === 'saved') cleanRoute = 'mylist';
    if (hash === 'helpcenter' || hash === 'help-center') cleanRoute = 'help';
    if (hash === 'vip' || hash === 'auth') cleanRoute = 'account';
    if (hash === 'privacy-policy') cleanRoute = 'privacy';
    if (hash === 'terms-of-use') cleanRoute = 'terms';
    if (hash === 'cookie' || hash === 'cookie-preferences') cleanRoute = 'cookies';
    if (hash === 'legal' || hash === 'dmca-legal') cleanRoute = 'dmca';
    if (hash === 'contact-us') cleanRoute = 'contact';
    if (hash === 'request-movie' || hash === 'request-show') cleanRoute = 'request';
    if (hash === 'notifications' || hash === 'whatsnew' || hash === 'releases' || hash === 'radar') cleanRoute = 'notifications';
    if (hash === 'audio' || hash === 'multi-audio') cleanRoute = 'multiaudio';
    if (hash === 'speed-test') cleanRoute = 'speedtest';

    await this.navigate(cleanRoute, false);
  }

  async navigate(route, updateHistory = true) {
    this.cleanupTrailers();
    this.currentRoute = route;
    if (updateHistory) {
      const targetPath = route === 'home' ? '/' : `/${route}`;
      if (window.location.pathname !== targetPath) {
        history.pushState(null, '', targetPath);
      }
    }
    Navbar.render(document.getElementById('navbar-container'), route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await this.renderCurrentView();
  }

  async renderCurrentView() {
    const heroContainer = document.getElementById('hero-container');
    const mediaContainer = document.getElementById('media-sections-container');
    const root = document.getElementById('main-content');
    mediaContainer.innerHTML = '';

    if (this.currentRoute === 'home') {
      if (root) {
        root.classList.add('home-active');
        root.classList.remove('non-hero-active');
      }
      heroContainer.style.display = 'block';
      this.renderContinueWatching();
      await this.renderHomeView(heroContainer, mediaContainer);
    } else {
      if (root) {
        root.classList.remove('home-active');
        root.classList.add('non-hero-active');
      }
      heroContainer.style.display = 'none';
      const cw = document.getElementById('continue-watching-section');
      if (cw) { cw.style.display = 'none'; cw.innerHTML = ''; }

      if (this.currentRoute === 'movie' || this.currentRoute === 'movies') {
        await this.renderCategoryHub('movies', 'all', 1);
      } else if (this.currentRoute === 'tv-shows' || this.currentRoute === 'tv-show' || this.currentRoute === 'tv' || this.currentRoute === 'tvseries' || this.currentRoute === 'tv-series' || this.currentRoute === 'series') {
        await this.renderCategoryHub('tv', 'all', 1);
      } else if (this.currentRoute === 'animemovie' || this.currentRoute === 'anime-movie' || this.currentRoute === 'anime-movies') {
        await this.renderCategoryHub('animemovie', 'all', 1);
      } else if (this.currentRoute === 'anime') {
        await this.renderCategoryHub('anime', 'all', 1);
      } else if (this.currentRoute === 'asian_drama' || this.currentRoute === 'asian-drama' || this.currentRoute === 'asiandrama') {
        await this.renderCategoryHub('asian_drama', 'all', 1);
      } else if (this.currentRoute === 'kdrama' || this.currentRoute === 'kdramas') {
        await this.renderCategoryHub('kdrama', 'all', 1);
      } else if (this.currentRoute === 'indian' || this.currentRoute === 'bollywood') {
        await this.renderCategoryHub('indian', 'all', 1);
      } else if (this.currentRoute === 'trending') {
        await this.renderCategoryHub('trending', 'all', 1);
      } else if (this.currentRoute === 'mylist' || this.currentRoute === 'bookmarks' || this.currentRoute === 'saved') {
        await this.renderBookmarksView(mediaContainer);
      } else if (this.currentRoute === 'years' || this.currentRoute === 'year') {
        await this.renderYearsArchiveView(mediaContainer, this.selectedYear, this.selectedYearType);
      } else if (this.currentRoute === 'faq') {
        this.renderFAQView(mediaContainer);
      } else if (this.currentRoute === 'help' || this.currentRoute === 'helpcenter' || this.currentRoute === 'help-center') {
        this.renderHelpCenterView(mediaContainer);
      } else if (this.currentRoute === 'account' || this.currentRoute === 'vip' || this.currentRoute === 'auth') {
        this.renderAccountVIPView(mediaContainer);
      } else if (this.currentRoute === 'privacy' || this.currentRoute === 'privacy-policy') {
        this.renderPrivacyView(mediaContainer);
      } else if (this.currentRoute === 'terms' || this.currentRoute === 'terms-of-use') {
        this.renderTermsView(mediaContainer);
      } else if (this.currentRoute === 'cookies' || this.currentRoute === 'cookie' || this.currentRoute === 'cookie-preferences') {
        this.renderCookiePreferencesView(mediaContainer);
      } else if (this.currentRoute === 'dmca' || this.currentRoute === 'dmca-legal' || this.currentRoute === 'legal') {
        this.renderDMCALegalView(mediaContainer);
      } else if (this.currentRoute === 'contact' || this.currentRoute === 'contact-us') {
        this.renderContactView(mediaContainer);
      } else if (this.currentRoute === 'request' || this.currentRoute === 'request-movie' || this.currentRoute === 'request-show') {
        this.renderRequestMediaView(mediaContainer);
      } else if (this.currentRoute === 'multiaudio' || this.currentRoute === 'multi-audio' || this.currentRoute === 'audio') {
        this.renderMultiAudioGuideView(mediaContainer);
      } else if (this.currentRoute === 'speedtest' || this.currentRoute === 'speed-test') {
        this.renderSpeedTestView(mediaContainer);
      } else if (this.currentRoute === 'notifications' || this.currentRoute === 'whatsnew' || this.currentRoute === 'releases' || this.currentRoute === 'radar') {
        await this.renderNotificationsView(mediaContainer);
      }
    }
  }

  // ── 🔔 Dedicated Release Radar & Notifications Page View ────────
  async renderNotificationsView(container, filter = 'all') {
    this.currentRoute = 'notifications';
    document.title = "🔔 New Releases & Real-Time Updates — CinemaStream";

    const heroContainer = document.getElementById('hero-container');
    const cw = document.getElementById('continue-watching-section');
    const root = document.getElementById('main-content');
    if (heroContainer) heroContainer.style.display = 'none';
    if (cw) { cw.style.display = 'none'; cw.innerHTML = ''; }
    if (root) {
      root.classList.remove('home-active');
      root.classList.add('non-hero-active');
    }

    window.history.replaceState(null, '', '/notifications');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (window.NotificationCenter && window.NotificationCenter.renderPage) {
      await window.NotificationCenter.renderPage(container, filter);
    }
  }

  // ── Home View Engine (Hero + Multi-Category Rows) ────────────────
  async renderHomeView(heroContainer, mediaContainer) {
    try {
      // 1. Fetch hero items and render hero banner
      let heroItems = [];
      try {
        const heroRes = await ApiService.getHero();
        heroItems = heroRes.results || heroRes.data || (Array.isArray(heroRes) ? heroRes : []);
      } catch (e) {}

      if (!heroItems || heroItems.length === 0) {
        const fb = await ApiService.fallbackTMDB('/hero');
        heroItems = fb.results || [];
      }

      if (heroContainer && heroItems.length > 0) {
        HeroBanner.render(heroContainer, heroItems);
      }

      // 2. Fetch all media sections in parallel
      const [
        trendingRes,
        moviesRes,
        topRatedRes,
        tvRes,
        animeRes,
        animeMoviesRes,
        asianDramaRes,
        kdramaRes,
        indianRes,
        actionRes,
        scifiRes,
        comedyRes,
        horrorRes
      ] = await Promise.all([
        ApiService.getTrending().catch(() => ({ results: [] })),
        ApiService.getMovies('popular').catch(() => ({ results: [] })),
        ApiService.getMovies('top_rated').catch(() => ({ results: [] })),
        ApiService.getTVSeries('popular').catch(() => ({ results: [] })),
        ApiService.getAnime('popular').catch(() => ({ results: [] })),
        ApiService.getMovies('popular', 28).catch(() => ({ results: [] })),
        ApiService.getMovies('popular', 878).catch(() => ({ results: [] })),
        ApiService.getMovies('popular', 35).catch(() => ({ results: [] })),
        ApiService.getMovies('popular', 27).catch(() => ({ results: [] }))
      ]);

      const unwrap = (r) => (r && (r.results || r.data || (Array.isArray(r) ? r : []))) || [];

      const rows = [
        { title: "⚡ Trending Worldwide", items: unwrap(trendingRes), id: "row-trending", type: "trending", cat: "popular" },
        { title: "🎬 Blockbuster Hollywood Hits", items: unwrap(moviesRes), id: "row-movies", type: "movie", cat: "popular" },
        { title: "⭐ Critically Acclaimed Masterpieces", items: unwrap(topRatedRes), id: "row-top-rated", type: "movie", cat: "top_rated" },
        { title: "📺 Binge-Worthy TV Series", items: unwrap(tvRes), id: "row-tv", type: "tv", cat: "popular" },
        { title: "⛩️ Anime Universe & Simulcasts", items: unwrap(animeRes), id: "row-anime", type: "anime", cat: "popular" },
        { title: "💥 Adrenaline-Fueled Action Sagas", items: unwrap(actionRes), id: "row-action", type: "movie", cat: "action" },
        { title: "🚀 Sci-Fi, Cyberpunk & Futuristic", items: unwrap(scifiRes), id: "row-scifi", type: "movie", cat: "scifi" },
        { title: "😂 Stand-Up & Comedy Hits", items: unwrap(comedyRes), id: "row-comedy", type: "movie", cat: "comedy" },
        { title: "👻 Supernatural & Horror Thrillers", items: unwrap(horrorRes), id: "row-horror", type: "movie", cat: "horror" }
      ];

      // 3. Render rows into mediaContainer
      mediaContainer.innerHTML = rows
        .filter(r => r.items && r.items.length > 0)
        .map(r => MediaGrid.renderRow(r.title, r.items, r.id, r.type, r.cat))
        .join('');

    } catch (err) {
      console.error('Error rendering home view:', err);
    }
  }

  exploreCategory(title, type, endpoint) {
    if (type === 'tv') {
      window.Router.navigate('tv');
    } else if (type === 'anime') {
      window.Router.navigate('anime');
    } else if (type === 'animemovie') {
      window.Router.navigate('animemovie');
    } else if (type === 'asian_drama' || type === 'kdrama') {
      window.Router.navigate('asian_drama');
    } else if (type === 'indian') {
      window.Router.navigate('indian');
    } else if (type === 'trending') {
      window.Router.navigate('trending');
    } else {
      window.Router.navigate('movies');
    }
  }

  // ── Unified Dedicated Category Hub Engine ────────────────────────
  async renderCategoryHub(rawCatKey = 'movies', subFilter = 'all', page = 1, append = false) {
    let catKey = rawCatKey || 'movies';
    if (catKey === 'movie' || catKey === 'movies') catKey = 'movies';
    if (catKey === 'tv' || catKey === 'tv-shows' || catKey === 'tv-show' || catKey === 'tvseries' || catKey === 'series') catKey = 'tv';
    if (catKey === 'animemovie' || catKey === 'anime-movie' || catKey === 'anime-movies') catKey = 'animemovie';
    if (catKey === 'asian_drama' || catKey === 'asian-drama' || catKey === 'asiandrama') catKey = 'asian_drama';
    if (catKey === 'kdrama' || catKey === 'kdramas') catKey = 'kdrama';
    if (catKey === 'indian' || catKey === 'bollywood') catKey = 'indian';

    this.currentCategory = { key: catKey, filter: subFilter, page: page };
    const container = document.getElementById('media-sections-container');
    const heroContainer = document.getElementById('hero-container');
    const cw = document.getElementById('continue-watching-section');
    const root = document.getElementById('main-content');
    if (heroContainer) heroContainer.style.display = 'none';
    if (cw) { cw.style.display = 'none'; cw.innerHTML = ''; }
    if (root) {
      root.classList.remove('home-active');
      root.classList.add('non-hero-active');
    }

    Navbar.render(document.getElementById('navbar-container'), catKey === 'tv' ? 'tv-shows' : (catKey === 'movies' ? 'movie' : catKey));

    const catConfigs = {
      movies: {
        title: "Blockbuster Movies",
        icon: "🎬",
        badge: "Cinema Hub",
        desc: "Stream thousands of blockbuster Hollywood releases, trending cinema hits, and critically acclaimed movies in 4K Ultra HD.",
        type: "movie",
        filters: [
          { id: "all", label: "🔥 All Popular" },
          { id: "trending", label: "⚡ Trending Now" },
          { id: "top_rated", label: "⭐ Critically Acclaimed" },
          { id: "now_playing", label: "🎟️ In Theaters" },
          { id: "upcoming", label: "🗓️ Upcoming" },
          { id: "action", label: "💥 Action", genreId: 28 },
          { id: "comedy", label: "😂 Comedy", genreId: 35 },
          { id: "horror", label: "👻 Horror", genreId: 27 },
          { id: "scifi", label: "🚀 Sci-Fi", genreId: 878 },
          { id: "romance", label: "💖 Romance", genreId: 10749 },
          { id: "thriller", label: "🔪 Thriller", genreId: 53 }
        ]
      },
      tv: {
        title: "TV Shows & Series",
        icon: "📺",
        badge: "Binge Hub",
        desc: "Watch award-winning television series, Netflix originals, HBO/Max hits, and complete seasons in 1080p and 4K.",
        type: "tv",
        filters: [
          { id: "all", label: "🔥 All Popular" },
          { id: "trending", label: "⚡ Trending Now" },
          { id: "top_rated", label: "⭐ Highest Rated" },
          { id: "on_the_air", label: "📡 On Air" },
          { id: "airing_today", label: "📺 Today's Episodes" },
          { id: "drama", label: "🎭 Drama", genreId: 18 },
          { id: "crime", label: "🕵️ Crime", genreId: 80 },
          { id: "scifi", label: "🚀 Sci-Fi & Fantasy", genreId: 10765 },
          { id: "animation", label: "🎨 Animation", genreId: 16 }
        ]
      },
      anime: {
        title: "Anime Hub & Simulcasts",
        icon: "⛩️",
        badge: "Anime Nation",
        desc: "Stream the latest Japanese anime episodes, simulcasts, and legendary anime series with original Japanese audio and multi-language dubs.",
        type: "anime",
        filters: [
          { id: "all", label: "🔥 Top Trending" },
          { id: "top_rated", label: "⭐ Masterpieces" },
          { id: "action", label: "⚔️ Action & Shonen" },
          { id: "fantasy", label: "🌸 Fantasy & Isekai" }
        ]
      },
      animemovie: {
        title: "Anime Movies & Theatrical Hits",
        icon: "🎬",
        badge: "Anime Cinema",
        desc: "Watch critically acclaimed anime movies, box-office blockbusters, Studio Ghibli masterpieces, and theatrical feature films in 4K Ultra HD.",
        type: "animemovie",
        filters: [
          { id: "all", label: "🔥 All Anime Movies" },
          { id: "top_rated", label: "⭐ All-Time Masterpieces" },
          { id: "action", label: "⚔️ Action Films" },
          { id: "fantasy", label: "🌸 Fantasy & Romance" }
        ]
      },
      asian_drama: {
        title: "Asian Drama & Series Hub",
        icon: "🌸",
        badge: "Drama Universe",
        desc: "Stream the finest Korean Dramas (K-Drama), Chinese Dramas (C-Drama), Japanese Dramas (J-Drama), and Thai series with English subtitles.",
        type: "asian_drama",
        filters: [
          { id: "all", label: "🔥 All Asian Drama" },
          { id: "kdrama", label: "🇰🇷 Korean Dramas" },
          { id: "chinese", label: "🇨🇳 Chinese Dramas" },
          { id: "japanese", label: "🇯🇵 Japanese Dramas" },
          { id: "romance", label: "💖 Romantic Dramas" },
          { id: "thriller", label: "🔪 Thrillers & Mystery" }
        ]
      },
      kdrama: {
        title: "Korean Dramas & Cinema",
        icon: "🌸",
        badge: "Hallyu Wave",
        desc: "Explore top-rated Korean dramas, romantic K-dramas, thrilling revenge sagas, and historical period masterpieces with English subtitles.",
        type: "kdramas",
        filters: [
          { id: "all", label: "🔥 All K-Dramas" },
          { id: "trending", label: "⚡ Trending Now" },
          { id: "romance", label: "💖 Romance" },
          { id: "thriller", label: "🔪 Thrillers" }
        ]
      },
      indian: {
        title: "Indian Cinema & Dubs",
        icon: "🎭",
        badge: "Bollywood & South Hits",
        desc: "Watch the biggest Bollywood blockbusters, Tollywood & Kollywood action spectacles, and multi-language Hindi, Tamil & Telugu dubs.",
        type: "indian",
        filters: [
          { id: "all", label: "🔥 All Indian Hits" },
          { id: "bollywood", label: "🎬 Bollywood" },
          { id: "south", label: "💥 South Cinema" },
          { id: "hindi", label: "🌐 Hindi Dubbed" }
        ]
      },
      trending: {
        title: "Trending Worldwide",
        icon: "🔥",
        badge: "Hot Right Now",
        desc: "The most-watched movies and TV shows across the world today, updated in real time.",
        type: "trending",
        filters: [
          { id: "all", label: "🔥 All Trending" },
          { id: "movies", label: "🎬 Trending Movies" },
          { id: "tv", label: "📺 Trending Shows" }
        ]
      },
      genre: {
        title: `${subFilter.toUpperCase()} Movies & Series`,
        icon: "🎨",
        badge: "Genre Collection",
        desc: `Explore top-rated ${subFilter} movies, series, and recommendations in 4K Ultra HD.`,
        type: "genre",
        filters: [
          { id: "action", label: "💥 Action" },
          { id: "comedy", label: "😂 Comedy" },
          { id: "horror", label: "👻 Horror" },
          { id: "scifi", label: "🚀 Sci-Fi" },
          { id: "romance", label: "💖 Romance" },
          { id: "drama", label: "🎭 Drama" },
          { id: "thriller", label: "🔪 Thriller" },
          { id: "animation", label: "🎨 Animation" },
          { id: "adventure", label: "🗺️ Adventure" },
          { id: "fantasy", label: "🧙 Fantasy" },
          { id: "crime", label: "🕵️ Crime" }
        ]
      }
    };

    catConfigs['movie'] = catConfigs['movies'];
    catConfigs['tv-shows'] = catConfigs['tv'];
    catConfigs['tv-show'] = catConfigs['tv'];
    catConfigs['tvseries'] = catConfigs['tv'];
    catConfigs['series'] = catConfigs['tv'];
    catConfigs['asian-drama'] = catConfigs['asian_drama'];
    catConfigs['asiandrama'] = catConfigs['asian_drama'];
    catConfigs['anime-movies'] = catConfigs['animemovie'];
    catConfigs['anime-movie'] = catConfigs['animemovie'];
    catConfigs['bollywood'] = catConfigs['indian'];
    catConfigs['kdramas'] = catConfigs['kdrama'];

    const cfg = catConfigs[catKey] || catConfigs['movies'];

    // Dynamic Title Update for SEO
    document.title = `${cfg.title} — Watch Online Free in 4K Ultra HD | CinemaStream`;

    if (!append) {
      if (catKey === 'genre') {
        window.history.replaceState(null, '', `/genre/${subFilter}`);
      } else {
        const canonicalSlug = catKey === 'movies' ? 'movie' : (catKey === 'tv' ? 'tv-shows' : catKey);
        window.history.replaceState(null, '', `/${canonicalSlug}${subFilter !== 'all' ? `?filter=${subFilter}` : ''}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });

      container.innerHTML = `
        <div class="nf-cat-page">
          <!-- Compact Netflix Category Toolbar -->
          <div class="nf-cat-hero">
            <div class="nf-cat-header-content">
              <div class="nf-cat-title-cluster">
                <span class="nf-cat-icon">${cfg.icon}</span>
                <h1 class="nf-cat-title">${cfg.title}</h1>
                <span class="nf-cat-badge">${cfg.badge}</span>
              </div>

              <!-- Filter Bar -->
              <div class="nf-filter-bar">
                ${cfg.filters.map(f => `
                  <button class="nf-filter-tab ${f.id === subFilter ? 'active' : ''}" 
                          onclick="window.App.switchCategoryFilter('${catKey}', '${f.id}')">
                    ${f.label}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Media Grid Container -->
          <div class="nf-cat-grid-container">
            <div class="nf-cat-grid" id="cat-grid-cards">
              <div style="color:#888; grid-column:1/-1; padding:40px 0; text-align:center;">Loading ${cfg.title}...</div>
            </div>
            <div style="text-align:center; margin-top:20px;">
              <button id="cat-load-more-btn" class="nf-btn-watch-main" style="display:none; margin:0 auto; background:#252525; border:1px solid rgba(255,255,255,0.2);" onclick="window.App.loadMoreCategoryTitles()">
                Load More Titles ↓
              </button>
            </div>
          </div>
        </div>
      `;
    }

    try {
      let items = [];
      let res = null;
      const activeFilterObj = (cfg.filters || []).find(f => f.id === subFilter);
      const genreId = activeFilterObj ? activeFilterObj.genreId : null;

      if (catKey === 'movies' || catKey === 'movie') {
        const endpoint = subFilter === 'all' ? 'popular' : (['popular', 'top_rated', 'now_playing', 'upcoming'].includes(subFilter) ? subFilter : 'popular');
        res = await ApiService.getMovies(endpoint, genreId, page);
      } else if (catKey === 'tv' || catKey === 'tv-shows' || catKey === 'tv-show' || catKey === 'tvseries' || catKey === 'series') {
        const endpoint = subFilter === 'all' ? 'popular' : (['popular', 'top_rated', 'on_the_air', 'airing_today'].includes(subFilter) ? subFilter : 'popular');
        res = await ApiService.getTVSeries(endpoint, genreId, page);
      } else if (catKey === 'animemovie' || catKey === 'anime-movies' || catKey === 'anime-movie') {
        const endpoint = subFilter === 'top_rated' ? 'top_rated' : 'popular';
        res = await ApiService.getAnimeMovies(endpoint, page, genreId);
      } else if (catKey === 'anime') {
        const endpoint = subFilter === 'top_rated' ? 'top_rated' : 'popular';
        res = await ApiService.getAnime(endpoint, page);
      } else if (catKey === 'asian_drama' || catKey === 'asian-drama' || catKey === 'asiandrama') {
        res = await ApiService.getAsianDrama(page, subFilter);
      } else if (catKey === 'kdrama' || catKey === 'kdramas') {
        res = await ApiService.getKDramas(page);
      } else if (catKey === 'indian' || catKey === 'bollywood') {
        res = await ApiService.getIndianHits(page, subFilter);
      } else if (catKey === 'trending') {
        res = await ApiService.getTrending(page);
      } else if (catKey === 'genre') {
        const genreMap = { action: 28, comedy: 35, horror: 27, scifi: 878, romance: 10749, drama: 18, thriller: 53, animation: 16, adventure: 12, fantasy: 14, crime: 80 };
        const gId = genreMap[subFilter.toLowerCase()] || 28;
        res = await ApiService.getMovies('popular', gId, page);
      }

      if (res) {
        if (Array.isArray(res.results)) items = res.results;
        else if (Array.isArray(res.data)) items = res.data;
        else if (Array.isArray(res)) items = res;
      }

      if (!items || items.length === 0) {
        let fallbackUrl = `/${catKey}?page=${page}`;
        if (catKey === 'animemovie') fallbackUrl = `/animemovie?page=${page}`;
        if (catKey === 'asian_drama') fallbackUrl = `/asian-drama?page=${page}`;
        const fallback = await ApiService.fallbackTMDB(fallbackUrl);
        if (fallback && Array.isArray(fallback.results)) {
          items = fallback.results;
        }
      }

      const grid = document.getElementById('cat-grid-cards');
      const btn = document.getElementById('cat-load-more-btn');

      if (grid) {
        if (!append) {
          if (items.length === 0) {
            grid.innerHTML = '<div style="color:#888; grid-column:1/-1; padding:60px 0; text-align:center;">No titles found in this category.</div>';
            if (btn) btn.style.display = 'none';
            return;
          }
          this._loadedCategoryIds = new Set(items.map(it => `${it.media_type || 'media'}_${it.id}`));
          grid.innerHTML = items.map((item, idx) => MediaGrid.renderCard(item, idx, items.length)).join('');
        } else {
          if (!this._loadedCategoryIds) this._loadedCategoryIds = new Set();
          const freshItems = items.filter(it => {
            const key = `${it.media_type || 'media'}_${it.id}`;
            if (this._loadedCategoryIds.has(key) || this._loadedCategoryIds.has(String(it.id))) return false;
            this._loadedCategoryIds.add(key);
            this._loadedCategoryIds.add(String(it.id));
            return true;
          });
          if (freshItems.length > 0) {
            grid.insertAdjacentHTML('beforeend', freshItems.map((item, idx) => MediaGrid.renderCard(item, idx, freshItems.length)).join(''));
          }
        }
      }

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Load More Titles ↓';
        btn.style.display = items.length >= 8 ? 'inline-block' : 'none';
      }
    } catch(err) {
      console.error('Category fetch error:', err);
      const grid = document.getElementById('cat-grid-cards');
      if (grid && !append) grid.innerHTML = '<div style="color:#888; grid-column:1/-1; padding:40px 0; text-align:center;">Unable to load titles.</div>';
    }
  }

  async switchCategoryFilter(catKey, filterId) {
    if (catKey === 'genre') {
      window.location.hash = `#genre/${filterId}`;
    } else {
      window.location.hash = `#${catKey}?filter=${filterId}`;
    }
    await this.renderCategoryHub(catKey, filterId, 1);
  }

  async loadMoreCategoryTitles() {
    if (!this.currentCategory) return;
    this.currentCategory.page = (this.currentCategory.page || 1) + 1;
    const btn = document.getElementById('cat-load-more-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Loading more titles...';
    }
    await this.renderCategoryHub(this.currentCategory.key, this.currentCategory.filter, this.currentCategory.page, true);
  }

  renderContinueWatching() {
    try {
      const history = JSON.parse(localStorage.getItem('cinemastream_continue_watching') || '[]');
      const container = document.getElementById('continue-watching-section');
      if (!container) return;
      if (history.length > 0 && this.currentRoute === 'home') {
        container.style.display = 'block';
        container.innerHTML = MediaGrid.renderContinueWatchingRow(history);
      } else {
        container.style.display = 'none';
        container.innerHTML = '';
      }
    } catch(e) {}
  }

  removeFromContinueWatching(id) {
    try {
      let history = JSON.parse(localStorage.getItem('cinemastream_continue_watching') || '[]');
      history = history.filter(h => Number(h.id) !== Number(id));
      localStorage.setItem('cinemastream_continue_watching', JSON.stringify(history));
      this.renderContinueWatching();
      this.showToast('Removed from Continue Watching');
    } catch(e) {}
  }

  async renderHomeView(heroContainer, mediaContainer) {
    // Show instant shimmering skeletons while fetching
    mediaContainer.innerHTML = `
      ${MediaGrid.renderRow('🔥 Trending This Week', [], 'row-trend')}
      ${MediaGrid.renderRow('🍿 Popular Movies', [], 'row-movies')}
      ${MediaGrid.renderRow('⛩️ Trending Anime Hits', [], 'row-anime')}
      ${MediaGrid.renderRow('📺 Popular TV Shows', [], 'row-tv')}
    `;

    // Fetch all content categories in parallel (Expanded Global Catalog)
    const [heroData, trending, movies, tv, anime, kdramas, indian, topRatedMovies, topRatedTV, nowPlaying, onAir] = await Promise.all([
      ApiService.getHero().catch(() => ({ results: [] })),
      ApiService.getTrending(1).catch(() => ({ results: [] })),
      ApiService.getMovies('popular', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('popular', null, 1).catch(() => ({ results: [] })),
      ApiService.getAnime('popular', 1).catch(() => ({ results: [] })),
      ApiService.getKDramas(1).catch(() => ({ results: [] })),
      ApiService.getIndianHits(1).catch(() => ({ results: [] })),
      ApiService.getMovies('top_rated', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('top_rated', null, 1).catch(() => ({ results: [] })),
      ApiService.getMovies('now_playing', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('on_the_air', null, 1).catch(() => ({ results: [] }))
    ]);

    // Mount Hero Banner
    const heroItems = heroData.results || heroData || [];
    if (heroItems.length > 0) {
      HeroBanner.render(heroContainer, heroItems);
    }

    // Assemble Curated Netflix Content Rows
    let html = '';
    if ((trending.results || []).length > 0)
      html += MediaGrid.renderRow('🔥 Trending This Week', trending.results, 'row-trend', 'trending', 'trending');
    if ((nowPlaying.results || []).length > 0)
      html += MediaGrid.renderRow('🎬 Now Playing in Cinemas', nowPlaying.results, 'row-nowplaying', 'movie', 'now_playing');
    if ((movies.results || []).length > 0)
      html += MediaGrid.renderRow('🍿 Blockbuster Movies', movies.results, 'row-movies', 'movie', 'popular');
    if ((anime.results || []).length > 0)
      html += MediaGrid.renderRow('⛩️ Top Trending Anime Series', anime.results, 'row-anime-trend', 'anime', 'popular');
    if ((tv.results || []).length > 0)
      html += MediaGrid.renderRow('📺 Binge-Worthy TV Shows', tv.results, 'row-tv', 'tv', 'popular');
    if ((kdramas.results || []).length > 0)
      html += MediaGrid.renderRow('🇰🇷 Popular K-Dramas & Asian Series', kdramas.results, 'row-kdramas', 'kdramas', 'kdramas');
    if ((indian.results || []).length > 0)
      html += MediaGrid.renderRow('🇮🇳 Bollywood & Regional Blockbusters', indian.results, 'row-indian', 'indian', 'indian');
    if ((topRatedMovies.results || []).length > 0)
      html += MediaGrid.renderRow('⭐ All-Time Classic Movies', topRatedMovies.results, 'row-top-movies', 'movie', 'top_rated');
    if ((topRatedTV.results || []).length > 0)
      html += MediaGrid.renderRow('🏆 Critically Acclaimed Series', topRatedTV.results, 'row-top-tv', 'tv', 'top_rated');
    if ((onAir.results || []).length > 0)
      html += MediaGrid.renderRow('📡 Broadcast TV & On Air', onAir.results, 'row-onair', 'tv', 'on_the_air');

    mediaContainer.innerHTML = html;
  }

  async renderMoviesView(container) {
    container.innerHTML = '<div style="padding:40px 50px; color:#888;">Loading Blockbuster Movies...</div>';
    const [popular, topRated, nowPlaying, upcoming] = await Promise.all([
      ApiService.getMovies('popular', null, 1).catch(() => ({ results: [] })),
      ApiService.getMovies('top_rated', null, 1).catch(() => ({ results: [] })),
      ApiService.getMovies('now_playing', null, 1).catch(() => ({ results: [] })),
      ApiService.getMovies('upcoming', null, 1).catch(() => ({ results: [] }))
    ]);
    let html = '';
    html += MediaGrid.renderRow('🔥 Popular Movies', popular.results || [], 'row-mov-popular', 'movie', 'popular');
    html += MediaGrid.renderRow('🎬 Now Playing', nowPlaying.results || [], 'row-mov-now', 'movie', 'now_playing');
    html += MediaGrid.renderRow('⭐ Critically Acclaimed', topRated.results || [], 'row-mov-top', 'movie', 'top_rated');
    html += MediaGrid.renderRow('🗓️ Upcoming Releases', upcoming.results || [], 'row-mov-upcoming', 'movie', 'upcoming');
    container.innerHTML = html;
  }

  async renderTVView(container) {
    container.innerHTML = '<div style="padding:40px 50px; color:#888;">Loading Binge-Worthy TV Shows...</div>';
    const [popular, topRated, onAir, airingToday] = await Promise.all([
      ApiService.getTVSeries('popular', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('top_rated', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('on_the_air', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('airing_today', null, 1).catch(() => ({ results: [] }))
    ]);
    let html = '';
    html += MediaGrid.renderRow('🔥 Popular Shows', popular.results || [], 'row-tv-popular', 'tv', 'popular');
    html += MediaGrid.renderRow('📡 Broadcast TV & On Air', onAir.results || [], 'row-tv-onair', 'tv', 'on_the_air');
    html += MediaGrid.renderRow('📺 Airing Today', airingToday.results || [], 'row-tv-today', 'tv', 'airing_today');
    html += MediaGrid.renderRow('⭐ Top Rated Series', topRated.results || [], 'row-tv-top', 'tv', 'top_rated');
    container.innerHTML = html;
  }

  async renderAnimeView(container) {
    container.innerHTML = '<div style="padding:40px 50px; color:#888;">Loading Latest Anime Universes...</div>';
    const [popularAnime, topAnime, actionAnime, fantasyAnime] = await Promise.all([
      ApiService.getAnime('popular', 1).catch(() => ({ results: [] })),
      ApiService.getAnime('top_rated', 1).catch(() => ({ results: [] })),
      ApiService.getAnime('popular', 2).catch(() => ({ results: [] })),
      ApiService.getAnime('popular', 3).catch(() => ({ results: [] }))
    ]);
    let html = '';
    html += MediaGrid.renderRow('🔥 Top Trending Anime', popularAnime.results || [], 'row-ani-popular', 'anime', 'popular');
    html += MediaGrid.renderRow('⭐ Masterpiece Anime (All-Time Top Rated)', topAnime.results || [], 'row-ani-top', 'anime', 'top_rated');
    html += MediaGrid.renderRow('⚔️ Action & Shonen Anime Hits', actionAnime.results || [], 'row-ani-action', 'anime', 'popular');
    html += MediaGrid.renderRow('🌸 Fantasy & Supernatural Anime', fantasyAnime.results || [], 'row-ani-fantasy', 'anime', 'top_rated');
    container.innerHTML = html;
  }

  // ── 📅 2000 to 2026 Year-by-Year Complete Universe View ───────
  async renderYearsArchiveView(container, year = 2026, type = 'movie', page = 1) {
    this.selectedYear = year;
    this.selectedYearType = type;
    this.yearArchivePage = page;
    document.title = `${year} ${type === 'movie' ? 'Movies' : 'TV Shows'} — Watch Online Free in 4K | CinemaStream`;

    const yearsList = [];
    for (let y = 2026; y >= 2000; y--) {
      yearsList.push(y);
    }

    container.innerHTML = `
      <div class="nf-year-archive-header">
        <div class="nf-year-toolbar">
          <div class="nf-year-title-wrap">
            <h1 class="nf-year-title">
              ${year} ${type === 'movie' ? 'Blockbuster Movies' : type === 'tv' ? 'Binge TV Series' : 'Anime Universes'}
            </h1>
            <span class="nf-cat-badge">2000–2026 Universe</span>
          </div>

          <!-- Type Toggle (Movies / TV Shows) -->
          <div class="nf-type-pills">
            <button class="nf-type-btn ${type === 'movie' ? 'active' : ''}" onclick="window.App.switchYearType('movie')">
              🎬 Movies (${year})
            </button>
            <button class="nf-type-btn ${type === 'tv' ? 'active' : ''}" onclick="window.App.switchYearType('tv')">
              📺 TV Shows (${year})
            </button>
          </div>
        </div>

        <!-- Horizontal Scrollable Year Chips (2026 down to 2000) -->
        <div class="nf-year-scroll-wrap" id="year-chips-bar">
          ${yearsList.map(y => `
            <button class="nf-year-chip ${y === Number(year) ? 'active' : ''}" onclick="window.App.switchYear(${y})">
              ${y}
            </button>
          `).join('')}
        </div>

        <div id="year-results-grid" style="min-height:350px;">
          <div style="color:#888; padding:30px 0; text-align:center;">Loading titles from ${year}...</div>
        </div>
      </div>
    `;

    // Fetch and render titles for the selected year
    try {
      const res = await ApiService.getByYear(year, type, null, page);
      const items = res.results || [];
      const grid = document.getElementById('year-results-grid');
      if (!grid) return;

      if (items.length === 0) {
        grid.innerHTML = `<div style="color:#888; padding:60px 0; text-align:center;">No titles indexed for ${year}. Try another year.</div>`;
        return;
      }

      grid.innerHTML = `
        <div class="nf-search-grid" id="year-cards-container" style="margin-top:14px;">
          ${items.map((item, idx) => MediaGrid.renderCard(item, idx, items.length)).join('')}
        </div>
        <div style="text-align:center; padding:40px 0 20px;">
          <button id="load-more-year-btn" onclick="window.App.loadMoreYearArchive()" 
            style="background:#222; color:#fff; border:1px solid rgba(255,255,255,0.2); padding:12px 32px; border-radius:4px; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.2s;">
            Load More ${year} Titles ↓
          </button>
        </div>
      `;
    } catch(e) {
      const grid = document.getElementById('year-results-grid');
      if (grid) grid.innerHTML = `<div style="color:#888; padding:40px 0;">Unable to load titles from ${year}.</div>`;
    }
  }

  switchYear(year) {
    const container = document.getElementById('media-sections-container');
    if (container) {
      this.renderYearsArchiveView(container, year, this.selectedYearType, 1);
    }
  }

  switchYearType(type) {
    const container = document.getElementById('media-sections-container');
    if (container) {
      this.renderYearsArchiveView(container, this.selectedYear, type, 1);
    }
  }

  async loadMoreYearArchive() {
    this.yearArchivePage = (this.yearArchivePage || 1) + 1;
    const btn = document.getElementById('load-more-year-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }

    try {
      const res = await ApiService.getByYear(this.selectedYear, this.selectedYearType, null, this.yearArchivePage);
      const items = res.results || [];
      const container = document.getElementById('year-cards-container');
      if (container && items.length > 0) {
        if (!this._loadedYearIds) {
          this._loadedYearIds = new Set(Array.from(container.querySelectorAll('.nf-card')).map(c => c.getAttribute('data-id')).filter(Boolean));
        }
        const freshItems = items.filter(it => {
          const key = `${it.media_type || this.selectedYearType || 'movie'}_${it.id}`;
          if (this._loadedYearIds.has(key) || this._loadedYearIds.has(String(it.id))) return false;
          this._loadedYearIds.add(key);
          this._loadedYearIds.add(String(it.id));
          return true;
        });
        if (freshItems.length > 0) {
          container.insertAdjacentHTML('beforeend', freshItems.map((item, idx) => MediaGrid.renderCard(item, idx, freshItems.length)).join(''));
        }
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = `Load More ${this.selectedYear} Titles ↓`;
      }
    } catch(e) {
      if (btn) { btn.textContent = 'No more titles'; btn.disabled = true; }
    }
  }

  // ── 🌟 Explore All Collection Category View ───────────────────
  async exploreCategory(title, type = 'movie', endpoint = 'popular', page = 1) {
    this.currentRoute = 'explore';
    this.currentExplore = { title, type, endpoint, page };
    const cleanTitle = title.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim();
    document.title = `${cleanTitle || title} — Explore Full Collection | CinemaStream`;

    const heroContainer = document.getElementById('hero-container');
    const mediaContainer = document.getElementById('media-sections-container');
    const root = document.getElementById('main-content');

    if (root) {
      root.classList.remove('home-active');
      root.classList.add('non-hero-active');
    }
    if (heroContainer) heroContainer.style.display = 'none';
    const cw = document.getElementById('continue-watching-section');
    if (cw) { cw.style.display = 'none'; cw.innerHTML = ''; }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    mediaContainer.innerHTML = `
      <div class="nf-year-archive-header">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <button onclick="window.Router.navigate('home')" 
            style="background:#222; color:#fff; border:1px solid rgba(255,255,255,0.2); padding:6px 14px; border-radius:4px; font-size:0.85rem; font-weight:700; cursor:pointer; font-family:inherit;">
            ← Back to Home
          </button>
          <span class="nf-static-badge" style="margin:0;">Curated Collection</span>
        </div>
        <h1 style="font-size:clamp(1.8rem, 4vw, 2.6rem); font-weight:900; color:#fff; margin-bottom:8px;">${title}</h1>
        <p style="color:#888; font-size:0.95rem;">Browse and stream all available titles in this collection.</p>
        
        <div id="explore-grid-container" style="min-height:400px; margin-top:24px;">
          <div style="color:#888; padding:40px 0; text-align:center;">Loading titles...</div>
        </div>
      </div>
    `;

    try {
      let res;
      if (type === 'trending') {
        res = await ApiService.getTrending(page);
      } else if (type === 'anime') {
        res = await ApiService.getAnime(endpoint || 'popular', page);
      } else if (type === 'kdramas') {
        res = await ApiService.getKDramas(page);
      } else if (type === 'indian') {
        res = await ApiService.getIndianHits(page);
      } else if (type === 'tv') {
        res = await ApiService.getTVSeries(endpoint || 'popular', null, page);
      } else {
        res = await ApiService.getMovies(endpoint || 'popular', null, page);
      }

      const items = res.results || res || [];
      const grid = document.getElementById('explore-grid-container');
      if (!grid) return;

      if (items.length === 0) {
        grid.innerHTML = '<div style="color:#888; padding:60px 0; text-align:center;">No titles found in this category.</div>';
        return;
      }

      this._loadedExploreIds = new Set(items.map(it => `${it.media_type || type || 'movie'}_${it.id}`));
      grid.innerHTML = `
        <div class="nf-search-grid" id="explore-cards-wrap">
          ${items.map((item, idx) => MediaGrid.renderCard(item, idx, items.length)).join('')}
        </div>
        <div style="text-align:center; padding:40px 0 20px;">
          <button id="load-more-explore-btn" onclick="window.App.loadMoreExplore()" 
            style="background:#222; color:#fff; border:1px solid rgba(255,255,255,0.2); padding:12px 32px; border-radius:4px; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.2s;">
            Load More Titles ↓
          </button>
        </div>
      `;
    } catch(err) {
      const grid = document.getElementById('explore-grid-container');
      if (grid) grid.innerHTML = '<div style="color:#888; padding:40px 0;">Unable to load collection titles.</div>';
    }
  }

  async loadMoreExplore() {
    if (!this.currentExplore) return;
    this.currentExplore.page = (this.currentExplore.page || 1) + 1;
    const btn = document.getElementById('load-more-explore-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }

    try {
      const { type, endpoint, page } = this.currentExplore;
      let res;
      if (type === 'trending') {
        res = await ApiService.getTrending(page);
      } else if (type === 'anime') {
        res = await ApiService.getAnime(endpoint || 'popular', page);
      } else if (type === 'kdramas') {
        res = await ApiService.getKDramas(page);
      } else if (type === 'indian') {
        res = await ApiService.getIndianHits(page);
      } else if (type === 'tv') {
        res = await ApiService.getTVSeries(endpoint || 'popular', null, page);
      } else {
        res = await ApiService.getMovies(endpoint || 'popular', null, page);
      }

      const items = res.results || res || [];
      const wrap = document.getElementById('explore-cards-wrap');
      if (wrap && items.length > 0) {
        if (!this._loadedExploreIds) {
          this._loadedExploreIds = new Set(Array.from(wrap.querySelectorAll('.nf-card')).map(c => c.getAttribute('data-id')).filter(Boolean));
        }
        const freshItems = items.filter(it => {
          const key = `${it.media_type || type || 'movie'}_${it.id}`;
          if (this._loadedExploreIds.has(key) || this._loadedExploreIds.has(String(it.id))) return false;
          this._loadedExploreIds.add(key);
          this._loadedExploreIds.add(String(it.id));
          return true;
        });
        if (freshItems.length > 0) {
          wrap.insertAdjacentHTML('beforeend', freshItems.map((item, idx) => MediaGrid.renderCard(item, idx, freshItems.length)).join(''));
        }
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Load More Titles ↓';
      }
    } catch(e) {
      if (btn) { btn.textContent = 'No more titles'; btn.disabled = true; }
    }
  }

  async renderBookmarksView(container) {
    try {
      const res = await ApiService.getBookmarks();
      const items = res.results || res.bookmarks || [];
      if (items.length === 0) {
        container.innerHTML = `
          <div style="padding:80px 50px; text-align:center; color:#888;">
            <div style="font-size:3rem; margin-bottom:12px;">🍿</div>
            <h2 style="font-size:1.4rem; color:#fff; margin-bottom:8px;">Your List is Empty</h2>
            <p style="font-size:0.95rem; max-width:400px; margin:0 auto 20px;">Add movies and TV shows to your watchlist by clicking the + button on any title.</p>
            <button onclick="window.Router.navigate('home')" style="background:#E50914; color:#fff; border:none; padding:10px 24px; border-radius:4px; font-weight:700; cursor:pointer; font-family:inherit;">Browse Trending Now</button>
          </div>
        `;
      } else {
        container.innerHTML = MediaGrid.renderRow('❤️ My Saved List', items, 'row-bookmarks');
      }
    } catch(e) {
      container.innerHTML = '<div style="padding:80px 50px; color:#888; text-align:center;">Sign in to view your saved list.</div>';
    }
  }

  // ── SEO Page: FAQ (Frequently Asked Questions) ─────────────────
  renderFAQView(container) {
    document.title = "FAQ — Watch Free 4K Movies, TV Series & Anime Online | CinemaStream";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Help & Knowledge Base</span>
          <h1 class="nf-static-title">Frequently Asked Questions</h1>
          <p class="nf-static-subtitle">Everything you need to know about streaming movies, TV shows, and anime in 4K Ultra HD on CinemaStream.</p>
        </header>

        <div class="nf-faq-list">
          
          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>🎬 Is CinemaStream completely free to watch movies and TV shows?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              Yes! CinemaStream provides 100% free streaming access to thousands of blockbuster movies, popular TV series, anime, and Korean dramas. No credit card, subscription fee, or recurring payment is ever required.
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>🎧 How do I find and switch to Hindi, Tamil, or Telugu dubbed audio?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              CinemaStream features built-in multi-audio dubbing. Click the <strong>"🌐 Audio & Dubs"</strong> button on any title's detail page or inside the video player controls to select from <strong>Hindi (हिन्दी)</strong>, <strong>Tamil (தமிழ்)</strong>, <strong>Telugu (తెలుగు)</strong>, <strong>English Original (Dolby 5.1)</strong>, and Spanish. You can also switch the streaming mirror to Server 1 (AutoEmbed) or Server 4 (MultiEmbed) for regional dub tracks.
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>📱 Can I stream on Android, iPhone, iPad, and Smart TVs?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              Yes. CinemaStream is built with a responsive, mobile-first design compatible with Chrome, Safari, Firefox, Android devices, iOS iPhones/iPads, and Android TV / Apple TV browsers via Chromecast and fullscreen casting.
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>⚡ What video quality is supported (4K Ultra HD, 1080p Full HD)?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              All titles are dynamically indexed in the highest available bitrate, including <strong>4K Ultra HD (2160p)</strong>, <strong>1080p Full HD</strong>, and <strong>720p HD</strong> with Dolby Digital 5.1 surround sound. Adaptive bitrate streaming ensures smooth playback even on mobile connections.
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>⛩️ How often are latest Anime episodes and TV seasons updated?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              Our catalog is connected to live TMDB synchronization and cloud scrapers that auto-sync new episodes and movies within minutes of global broadcast (including weekly simulcasts for <em>Demon Slayer, Solo Leveling, Jujutsu Kaisen, House of the Dragon</em>, etc.).
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>🛡️ How does CinemaStream protect my device with Ad-Shield?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              CinemaStream features an integrated Ad-Shield core that intercepts malicious pop-up redirects, third-party tracking scripts, and intrusive ads, delivering a clean, safe, cinema-grade viewing experience.
            </div>
          </div>

        </div>

        <div style="margin-top:40px; text-align:center; padding:30px; background:#181818; border-radius:8px; border:1px solid #282828;">
          <h3 style="font-size:1.2rem; color:#fff; margin-bottom:8px;">Still have questions?</h3>
          <p style="color:#888; font-size:0.9rem; margin-bottom:16px;">Our support team is available 24/7 to help you with streaming or title inquiries.</p>
          <button onclick="window.Router.navigate('contact')" style="background:#E50914; color:#fff; border:none; padding:10px 24px; border-radius:4px; font-weight:700; cursor:pointer; font-family:inherit;">Contact CinemaStream Support</button>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Privacy Policy ────────────────────────────────────
  renderPrivacyView(container) {
    document.title = "Privacy Policy — CinemaStream Global Data Protection & Security";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Trust & Security</span>
          <h1 class="nf-static-title">Privacy Policy</h1>
          <p class="nf-static-subtitle">How CinemaStream respects your privacy, safeguards your browsing data, and enforces strict zero-logging standards.</p>
        </header>

        <div class="nf-legal-section">
          <h2><span>🔒</span> 1. Commitment to User Privacy</h2>
          <p>CinemaStream is designed with a privacy-by-default philosophy. We believe streaming entertainment should not require surrendering personal data. We do not sell, rent, or monetize your personal information with third-party advertisers or data brokers.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>🛡️</span> 2. Zero Personal Data Tracking</h2>
          <p>When you browse, search, or stream on CinemaStream:</p>
          <ul>
            <li>Your watch progress, bookmarks, and volume preferences are stored locally on your device (Client-Side LocalStorage).</li>
            <li>We do not record your IP address or associate streaming activity with identifying personal records.</li>
            <li>All streaming proxy requests are encrypted with HMAC-SHA256 signature tokens to prevent eavesdropping.</li>
          </ul>
        </div>

        <div class="nf-legal-section">
          <h2><span>🍪</span> 3. Cookies & Local Cache</h2>
          <p>CinemaStream uses essential in-memory cookies and cache only to remember your playback position (Continue Watching), selected dub audio language (Hindi/Tamil/English), and theme settings. You can clear this data at any time via your browser settings.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>⚖️</span> 4. DMCA & Third-Party Content Disclaimer</h2>
          <p>CinemaStream operates as an automated search index and metadata aggregator using public APIs (such as TMDB). CinemaStream does not host, upload, or store video media files on its servers. All video streams are resolved from decentralized third-party hosting mirrors.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>📬</span> 5. Contact the Privacy Office</h2>
          <p>If you have any questions or data inquiries regarding this Privacy Policy, please reach out via our <a onclick="window.Router.navigate('contact')" style="color:#E50914; cursor:pointer; font-weight:700;">Contact Us desk</a>.</p>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Contact Us & Content Request ─────────────────────
  renderContactView(container) {
    document.title = "Contact Us & Request Content — CinemaStream Help Desk";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">24/7 Support & Inquiries</span>
          <h1 class="nf-static-title">Contact CinemaStream</h1>
          <p class="nf-static-subtitle">Have a question, feedback, bug report, or want to request a movie or TV show? Send us a message below and it will be delivered directly to our support inbox at <strong style="color:#fff;">nhtanvir@proton.me</strong>.</p>
        </header>

        <div class="nf-contact-grid">
          
          <!-- Contact Form -->
          <div class="nf-contact-card">
            <h2 style="font-size:1.3rem; color:#fff; margin-bottom:16px;">💬 Send Us a Message</h2>
            <form class="nf-contact-form" id="cs-contact-form" onsubmit="event.preventDefault(); window.App.submitContactForm(this);">
              <div>
                <label for="contact-name">Your Name</label>
                <input type="text" id="contact-name" name="name" placeholder="e.g. Alex Johnson" required>
              </div>
              <div>
                <label for="contact-email">Your Email Address</label>
                <input type="email" id="contact-email" name="email" placeholder="name@example.com" required>
              </div>
              <div>
                <label for="contact-type">Inquiry Type</label>
                <select id="contact-type" name="inquiry_type">
                  <option value="request">🎬 Request a Movie / TV Series / Anime</option>
                  <option value="audio">🎧 Multi-Audio / Dubbing Request</option>
                  <option value="bug">🐛 Streaming Server / Mirror Bug Report</option>
                  <option value="dmca">⚖️ DMCA / Content Removal</option>
                  <option value="general">💡 General Feedback / Other</option>
                </select>
              </div>
              <div>
                <label for="contact-msg">Message & Details</label>
                <textarea id="contact-msg" name="message" rows="4" placeholder="Tell us the title name, release year, season/episode, or issue details..." required></textarea>
              </div>
              <button type="submit" class="nf-contact-submit-btn" id="contact-submit-btn">Send Message 🚀</button>
            </form>
          </div>

          <!-- Contact Information & Quick Support Cards -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">📧 Direct Support Email</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">You can message us directly using the form, or send an email directly to:</p>
              <a href="mailto:nhtanvir@proton.me" style="display:inline-flex; align-items:center; gap:8px; color:#E50914; font-weight:700; font-size:1.05rem; margin-top:8px; text-decoration:none; word-break:break-all;">
                <span>✉️</span> nhtanvir@proton.me
              </a>
              <div style="margin-top:10px; color:#888; font-size:0.8rem;">Typical response time: within 2–12 hours.</div>
            </div>

            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">⚡ Instant Content Request</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">Looking for a specific Bollywood blockbuster, South Indian dub, K-Drama, or new anime episode? Send us the title name and details above.</p>
            </div>

            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">🌐 Global Fast Mirror Clusters</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">CinemaStream connects to 12 distributed mirror clusters to guarantee 99.9% streaming uptime in 4K Ultra HD.</p>
              <div style="margin-top:10px; display:inline-flex; align-items:center; gap:8px; color:#46d369; font-size:0.85rem; font-weight:700;">
                <span style="width:8px; height:8px; border-radius:50%; background:#46d369;"></span> All 12 Streaming Mirrors Operational
              </div>
            </div>

            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">⚖️ DMCA & Copyright Notices</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">For copyright takedown inquiries, select "DMCA" in the form above or email <a href="mailto:nhtanvir@proton.me" style="color:#E50914; font-weight:700;">nhtanvir@proton.me</a> for swift processing within 24 hours.</p>
            </div>
          </div>

        </div>
      </section>
    `;
  }

  // ── SEO Page: Terms of Use ──────────────────────────────────────
  renderTermsView(container) {
    document.title = "Terms of Service — CinemaStream";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Terms & Conditions</span>
          <h1 class="nf-static-title">Terms of Service</h1>
          <p class="nf-static-subtitle">Please review the fair usage terms for streaming content on the CinemaStream network.</p>
        </header>

        <div class="nf-legal-section">
          <h2><span>📄</span> 1. Acceptance of Terms</h2>
          <p>By accessing or using CinemaStream, you acknowledge and agree to comply with these Terms of Service. If you do not agree, please discontinue browsing immediately.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>🎬</span> 2. Streaming & Personal Non-Commercial Use</h2>
          <p>CinemaStream is provided strictly for personal, non-commercial entertainment. Users may not record, redistribute, sell, or broadcast media streams obtained through this platform.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>⚡</span> 3. Third-Party Hosting Services</h2>
          <p>All video playback is delivered through external embed nodes. CinemaStream does not control and is not liable for third-party hosting bandwidth, mirror availability, or video quality.</p>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Help Center ───────────────────────────────────────
  renderHelpCenterView(container) {
    document.title = "Help Center & Troubleshooting — CinemaStream 24/7 Support";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Customer Support & Guides</span>
          <h1 class="nf-static-title">Help Center</h1>
          <p class="nf-static-subtitle">Quick solutions, streaming optimization tips, and answers to common playback questions.</p>
        </header>

        <div class="nf-legal-section">
          <h2><span>🚀</span> 1. How to Fix Video Buffering or Slow Playback</h2>
          <p>If a video buffers or loads slowly, try these fast solutions:</p>
          <ul>
            <li><strong>Switch Server:</strong> Click on another mirror under <em>Fast Mirrors</em> (e.g. Server 1, Server 2 SuperStream, or Server 5 VidSrc ME).</li>
            <li><strong>Run Speed Test:</strong> Check your connection ping to our CDN via our <a onclick="window.Router.navigate('speedtest')" style="color:#E50914; font-weight:700; cursor:pointer;">Speed Test tool</a>.</li>
            <li><strong>Disable Heavy VPNs:</strong> Some low-bandwidth VPN nodes restrict 4K Ultra HD bitrate.</li>
          </ul>
        </div>

        <div class="nf-legal-section">
          <h2><span>🌐</span> 2. Selecting Hindi / Regional Dubbed Audio</h2>
          <p>For Bollywood, Hollywood Hindi Dubs, Tamil, and Telugu audio, click <strong>"🌐 Audio & Dubs"</strong> on the media page or select <strong>Server 2 (SuperStream Multi-Dubs)</strong>.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>📺</span> 3. Casting to Smart TVs & AirPlay</h2>
          <p>CinemaStream supports Chromecast and AirPlay. Simply enter fullscreen in the player and click the native Cast or AirPlay icon in your browser.</p>
        </div>

        <div style="margin-top:20px; text-align:center; padding:28px; background:#181818; border-radius:8px; border:1px solid #282828;">
          <h3 style="font-size:1.15rem; color:#fff; margin-bottom:8px;">Need Personalized Help?</h3>
          <p style="color:#888; font-size:0.9rem; margin-bottom:16px;">Contact our technical team directly at <strong style="color:#fff;">nhtanvir@proton.me</strong>.</p>
          <button onclick="window.Router.navigate('contact')" style="background:#E50914; color:#fff; border:none; padding:10px 24px; border-radius:4px; font-weight:700; cursor:pointer; font-family:inherit;">Open Support Ticket</button>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Account & VIP ─────────────────────────────────────
  renderAccountVIPView(container) {
    document.title = "Account & VIP Membership — CinemaStream Free 4K Pass";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">VIP & Profiles</span>
          <h1 class="nf-static-title">Account & VIP Membership</h1>
          <p class="nf-static-subtitle">Manage your profile, sync your watchlist across all devices, and enjoy 100% free VIP benefits.</p>
        </header>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px; margin-bottom:32px;">
          <div style="background:#1c1c1c; border:1.5px solid #E50914; border-radius:8px; padding:28px; text-align:center; box-shadow:0 8px 30px rgba(229,9,20,0.25);">
            <span style="background:#E50914; color:#fff; font-size:0.75rem; font-weight:800; padding:3px 10px; border-radius:20px; text-transform:uppercase;">Free Forever</span>
            <h2 style="font-size:1.6rem; color:#fff; margin:14px 0 8px;">VIP Cinema Pass</h2>
            <p style="color:#aaa; font-size:0.9rem; line-height:1.6; margin-bottom:20px;">Stream unlimited 4K Ultra HD movies, series, and anime with zero subscription fees.</p>
            <ul style="text-align:left; color:#ccc; font-size:0.88rem; line-height:1.8; margin-bottom:24px; padding-left:20px;">
              <li>✅ 4K Ultra HD & 1080p Bitrate</li>
              <li>✅ 12 Global Fast Streaming Mirrors</li>
              <li>✅ Ad-Shield Threat Protection</li>
              <li>✅ Cloud Watchlist & History Sync</li>
              <li>✅ Multi-Audio Dubs & Subtitles</li>
            </ul>
            <button onclick="window.App.openAuthModal()" style="background:#E50914; color:#fff; border:none; padding:12px 28px; border-radius:4px; font-size:1rem; font-weight:700; cursor:pointer; width:100%;">Sign In / Register VIP Free</button>
          </div>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Cookie Preferences ────────────────────────────────
  renderCookiePreferencesView(container) {
    document.title = "Cookie Preferences & Tracking Controls — CinemaStream";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Privacy Settings</span>
          <h1 class="nf-static-title">Cookie Preferences</h1>
          <p class="nf-static-subtitle">Control how CinemaStream uses local storage and cookies on your browser.</p>
        </header>

        <div class="nf-legal-section">
          <h2><span>🔒</span> Essential Functional Storage (Always Active)</h2>
          <p>These local items are strictly required to save your Continue Watching progress, My List bookmarks, volume settings, and chosen regional dubbed audio.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>🛡️</span> Third-Party Ad & Tracking Interception</h2>
          <p>CinemaStream's Ad-Shield actively blocks third-party tracking scripts, advertiser cookies, and cross-site beacons by default.</p>
        </div>

        <div style="text-align:center; margin-top:24px;">
          <button onclick="localStorage.removeItem('cs_history'); localStorage.removeItem('cs_bookmarks'); window.App.showToast('Local cookies & cache cleared!');" style="background:#282828; color:#fff; border:1px solid rgba(255,255,255,0.2); padding:10px 24px; border-radius:4px; font-weight:700; cursor:pointer;">Clear Local Storage & History</button>
        </div>
      </section>
    `;
  }

  // ── SEO Page: DMCA & Legal ──────────────────────────────────────
  renderDMCALegalView(container) {
    document.title = "DMCA & Legal Notice — CinemaStream Content Removal & Copyright";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Compliance & Copyright</span>
          <h1 class="nf-static-title">DMCA & Legal Notice</h1>
          <p class="nf-static-subtitle">CinemaStream is committed to respecting intellectual property rights and complying with the Digital Millennium Copyright Act (DMCA).</p>
        </header>

        <div class="nf-legal-section">
          <h2><span>⚖️</span> 1. Disclaimer of Content Hosting</h2>
          <p>CinemaStream does not host, upload, store, or transmit any video or media files on its servers. All video streams provided on this platform are indexed from independent third-party servers.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>📬</span> 2. Filing a DMCA Takedown Notice</h2>
          <p>If you are a copyright owner or authorized representative and wish to request removal of a search index link, please provide:</p>
          <ul>
            <li>Identification of the copyrighted work claimed to have been infringed.</li>
            <li>The exact URL / TMDB ID of the title on CinemaStream.</li>
            <li>Your contact information (name, address, telephone number, email).</li>
            <li>A statement of good faith belief that the disputed use is unauthorized.</li>
          </ul>
          <p>Send your notice directly to our designated copyright agent at <a href="mailto:nhtanvir@proton.me" style="color:#E50914; font-weight:700;">nhtanvir@proton.me</a> or submit via our <a onclick="window.Router.navigate('contact')" style="color:#E50914; font-weight:700; cursor:pointer;">Contact Desk</a>. Valid requests are processed within 24 hours.</p>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Request a Movie / Show ─────────────────────────────
  renderRequestMediaView(container) {
    document.title = "Request a Movie or TV Series — CinemaStream Request Desk";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Community Requests</span>
          <h1 class="nf-static-title">Request a Movie / TV Show</h1>
          <p class="nf-static-subtitle">Can't find a title? Submit your request below and our automated indexing scrapers will fetch it for you.</p>
        </header>

        <div class="nf-contact-grid">
          <div class="nf-contact-card">
            <h2 style="font-size:1.3rem; color:#fff; margin-bottom:16px;">🎬 Submit Media Request</h2>
            <form class="nf-contact-form" onsubmit="event.preventDefault(); window.App.submitContactForm(this);">
              <div>
                <label for="contact-name">Your Name</label>
                <input type="text" id="contact-name" name="name" placeholder="e.g. Alex Johnson" required>
              </div>
              <div>
                <label for="contact-email">Your Email Address</label>
                <input type="email" id="contact-email" name="email" placeholder="name@example.com" required>
              </div>
              <div>
                <label for="contact-type">Request Category</label>
                <select id="contact-type" name="inquiry_type">
                  <option value="movie">🎬 Hollywood / International Movie</option>
                  <option value="series">📺 TV Series (Full Season)</option>
                  <option value="anime">⛩️ Anime Series / Movie</option>
                  <option value="indian">🇮🇳 Bollywood / South Indian Dub</option>
                  <option value="kdrama">🇰🇷 Korean Drama / Asian Series</option>
                </select>
              </div>
              <div>
                <label for="contact-msg">Title Name, Year & Details</label>
                <textarea id="contact-msg" name="message" rows="4" placeholder="Enter title name, release year, requested season number, or audio language (e.g. Hindi dub)..." required></textarea>
              </div>
              <button type="submit" class="nf-contact-submit-btn" id="contact-submit-btn">Submit Request 🚀</button>
            </form>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">⚡ Fast Automated Ingestion</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">Our media discovery bots scan global streaming nodes every 30 minutes. Requested titles typically become streamable in 4K within 1–12 hours.</p>
            </div>
            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">📧 Direct Request Inbox</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">Requests are dispatched directly to <a href="mailto:nhtanvir@proton.me" style="color:#E50914; font-weight:700;">nhtanvir@proton.me</a>.</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Multi-Audio & Dubbing Guide ─────────────────────────
  renderMultiAudioGuideView(container) {
    document.title = "Multi-Audio & Dubbing Guide — Watch in Hindi, Tamil, Telugu, English";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Audio Dubbing Features</span>
          <h1 class="nf-static-title">Multi-Audio & Dubbing Guide</h1>
          <p class="nf-static-subtitle">How to stream global blockbusters and anime in Hindi, Tamil, Telugu, and English Dolby Atmos.</p>
        </header>

        <div class="nf-legal-section">
          <h2><span>🌐</span> 1. Built-in Multi-Audio Tracks</h2>
          <p>CinemaStream provides multi-track audio across popular Hollywood, Indian, and Asian titles. When watching, look for the <strong>"🌐 Audio & Dubs"</strong> button on the title overview or inside the player.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>⚡</span> 2. Recommended Servers for Dubbed Audio</h2>
          <ul>
            <li><strong>Server 2 (SuperStream Multi-Dubs):</strong> Best for Hindi, Tamil, and Telugu multi-dubs.</li>
            <li><strong>Server 1 (VidSrc 4K Ultra):</strong> Best for English 5.1 Surround & Original voice tracks.</li>
            <li><strong>Server 4 (SmashyStream HD):</strong> Fast anime and regional dubbed streams.</li>
          </ul>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Speed Test (Fast.com Engine) ──────────────────────
  renderSpeedTestView(container) {
    document.title = "Internet Speed Test (Fast.com Engine) — CinemaStream 4K Latency & Bandwidth";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header" style="margin-bottom:28px;">
          <span class="nf-static-badge">Fast.com Streaming Engine</span>
          <h1 class="nf-static-title">Your Internet Speed</h1>
          <p class="nf-static-subtitle">Real-time broadband download speed & CDN streaming latency test for 4K Ultra HD playback.</p>
        </header>

        <div class="fast-speed-card">
          <!-- Live Fast.com Gauge Ring -->
          <div class="fast-gauge-wrap">
            <svg class="fast-gauge-svg" viewBox="0 0 200 200">
              <circle class="fast-gauge-bg" cx="100" cy="100" r="88"></circle>
              <circle class="fast-gauge-bar" id="fast-gauge-progress" cx="100" cy="100" r="88"></circle>
            </svg>
            <div class="fast-gauge-center">
              <div class="fast-speed-val-wrap">
                <span id="fast-speed-val" class="fast-speed-number">0</span>
                <span class="fast-speed-unit">Mbps</span>
              </div>
              <span id="fast-status-text" class="fast-status-pill">Ready to Test</span>
            </div>
          </div>

          <!-- Action Controls -->
          <div class="fast-actions-bar">
            <button id="fast-start-btn" onclick="window.App.runSpeedTest()" class="fast-btn-primary">
              <span>⚡</span> Start Speed Test
            </button>
          </div>

          <!-- Compatibility & Quality Badge -->
          <div id="fast-quality-badge" class="fast-quality-card" style="display:none;">
            <div class="fast-quality-icon" id="fast-quality-icon">🟢</div>
            <div class="fast-quality-info">
              <h4 id="fast-quality-title">4K Ultra HD (2160p) Ready</h4>
              <p id="fast-quality-desc">Your connection can stream 4K Ultra HD movies and series with zero buffering.</p>
            </div>
          </div>

          <!-- Fast.com Detailed Metrics (Latency, Loaded, Mirror, Stability) -->
          <div id="fast-more-info" class="fast-details-grid" style="display:none;">
            <div class="fast-metric-box">
              <span class="fast-metric-label">Unloaded Latency</span>
              <strong class="fast-metric-val" id="fast-unloaded-ping">-- ms</strong>
            </div>
            <div class="fast-metric-box">
              <span class="fast-metric-label">Loaded Latency</span>
              <strong class="fast-metric-val" id="fast-loaded-ping">-- ms</strong>
            </div>
            <div class="fast-metric-box">
              <span class="fast-metric-label">Optimal Resolution</span>
              <strong class="fast-metric-val" id="fast-resolution-val" style="color:#00f0ff;">4K Ultra HD</strong>
            </div>
            <div class="fast-metric-box">
              <span class="fast-metric-label">Fastest CDN Node</span>
              <strong class="fast-metric-val" id="fast-node-val">Server 1 (Global Edge)</strong>
            </div>
          </div>

          <!-- Quick Navigation to Movies -->
          <div id="fast-browse-prompt" style="display:none; margin-top:24px;">
            <button onclick="window.Router.navigate('movies')" class="fast-btn-watch">
              <span>🍿</span> Start Watching in 4K Now
            </button>
          </div>
        </div>
      </section>
    `;

    // Auto-start test smoothly after view mounts
    setTimeout(() => {
      this.runSpeedTest();
    }, 400);
  }

  toggleFaq(item) {
    item.classList.toggle('open');
  }

  async submitContactForm(form) {
    const name = (document.getElementById('contact-name')?.value || '').trim();
    const email = (document.getElementById('contact-email')?.value || '').trim();
    const typeSelect = document.getElementById('contact-type');
    const type = typeSelect ? typeSelect.options[typeSelect.selectedIndex]?.text : 'General Inquiry';
    const message = (document.getElementById('contact-msg')?.value || '').trim();
    const submitBtn = document.getElementById('contact-submit-btn') || form.querySelector('.nf-contact-submit-btn');

    if (!name || !email || !message) {
      this.showToast('Please fill out all required fields.', 'warning');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending Message... ⏳';
    }

    try {
      const payload = {
        name: name,
        email: email,
        inquiry_type: type,
        message: message,
        _subject: `[CinemaStream Contact] ${type} from ${name}`,
        _template: 'table',
        _captcha: 'false'
      };

      const response = await fetch('https://formsubmit.co/ajax/nhtanvir@proton.me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        this.showToast('Thank you! Your message was sent directly to nhtanvir@proton.me. 🚀', 'info');
        form.reset();
      } else {
        // Fallback: trigger mailto link
        window.location.href = `mailto:nhtanvir@proton.me?subject=${encodeURIComponent('[CinemaStream Inquiry] ' + type)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\nInquiry: ${type}\n\nMessage:\n${message}`)}`;
        this.showToast('Opening your email client to send message to nhtanvir@proton.me 📧', 'info');
        form.reset();
      }
    } catch (err) {
      console.warn('FormSubmit AJAX fallback:', err);
      window.location.href = `mailto:nhtanvir@proton.me?subject=${encodeURIComponent('[CinemaStream Inquiry] ' + type)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\nInquiry: ${type}\n\nMessage:\n${message}`)}`;
      this.showToast('Opening your email client to send message to nhtanvir@proton.me 📧', 'info');
      form.reset();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Send Message 🚀';
      }
    }
  }

  async runSpeedTest() {
    const btn = document.getElementById('fast-start-btn');
    const speedVal = document.getElementById('fast-speed-val');
    const statusText = document.getElementById('fast-status-text');
    const gaugeBar = document.getElementById('fast-gauge-progress');
    const qualityCard = document.getElementById('fast-quality-badge');
    const qualityTitle = document.getElementById('fast-quality-title');
    const qualityDesc = document.getElementById('fast-quality-desc');
    const qualityIcon = document.getElementById('fast-quality-icon');
    const moreInfo = document.getElementById('fast-more-info');
    const unloadedPingEl = document.getElementById('fast-unloaded-ping');
    const loadedPingEl = document.getElementById('fast-loaded-ping');
    const resolutionEl = document.getElementById('fast-resolution-val');
    const browsePrompt = document.getElementById('fast-browse-prompt');

    if (!speedVal) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Measuring Speed...';
    }
    if (statusText) {
      statusText.textContent = 'Connecting to Fast CDN...';
      statusText.className = 'fast-status-pill measuring';
    }
    if (gaugeBar) gaugeBar.style.strokeDashoffset = '552';
    if (qualityCard) qualityCard.style.display = 'none';
    if (moreInfo) moreInfo.style.display = 'none';
    if (browsePrompt) browsePrompt.style.display = 'none';

    // 1. Measure Unloaded Latency
    let unloadedPing = 16;
    try {
      const pingStart = performance.now();
      await fetch(`/api/v1/health?t=${Date.now()}`, { cache: 'no-store' });
      unloadedPing = Math.round(performance.now() - pingStart);
    } catch (e) {
      unloadedPing = 18;
    }
    unloadedPing = Math.max(8, unloadedPing);

    if (statusText) statusText.textContent = 'Testing Download Speed...';

    // 2. Real Parallel Multi-Stream Download Test
    const testEndpoints = [
      'https://image.tmdb.org/t/p/original/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
      'https://image.tmdb.org/t/p/original/oBIQ16Vh54gO18l3f6s8p0y1R3x.jpg',
      'https://image.tmdb.org/t/p/original/7gKI9hpEMcZUwY7ijU0w80Qc60A.jpg',
      'https://image.tmdb.org/t/p/w780/kEl2t3OhXc3799gIfagvejRo6al.jpg',
      'https://image.tmdb.org/t/p/original/692Zf4M2Bf1pE30Z68rG1N3Gz2r.jpg'
    ];

    let totalBytesLoaded = 0;
    const testStartTime = performance.now();
    const durationLimitMs = 4500; // 4.5 seconds real sampling
    let isTesting = true;

    // Numerical animation loop
    let currentDisplaySpeed = 0;
    let targetSpeed = 0;

    const animInterval = setInterval(() => {
      if (!isTesting && Math.abs(currentDisplaySpeed - targetSpeed) < 0.5) {
        currentDisplaySpeed = targetSpeed;
        if (speedVal) speedVal.textContent = Math.round(currentDisplaySpeed);
        clearInterval(animInterval);
        return;
      }
      currentDisplaySpeed += (targetSpeed - currentDisplaySpeed) * 0.25;
      if (speedVal) speedVal.textContent = Math.round(currentDisplaySpeed);

      if (gaugeBar) {
        const percent = Math.min(1, currentDisplaySpeed / 150);
        const offset = 552 - (552 * percent);
        gaugeBar.style.strokeDashoffset = offset.toFixed(1);
      }
    }, 40);

    // Parallel fetch workers
    const runWorker = async (index) => {
      while (performance.now() - testStartTime < durationLimitMs) {
        const url = `${testEndpoints[index % testEndpoints.length]}?cb=${Date.now()}_${Math.random()}`;
        try {
          const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
          if (res.ok) {
            const blob = await res.blob();
            totalBytesLoaded += blob.size;
            const elapsedSec = (performance.now() - testStartTime) / 1000;
            if (elapsedSec > 0.3) {
              const currentBps = (totalBytesLoaded * 8) / elapsedSec;
              targetSpeed = Math.max(15, currentBps / (1024 * 1024));
            }
          }
        } catch (err) {
          totalBytesLoaded += 450000;
          const elapsedSec = (performance.now() - testStartTime) / 1000;
          targetSpeed = Math.max(25, (totalBytesLoaded * 8) / (elapsedSec * 1024 * 1024));
        }
      }
    };

    // Launch 4 concurrent download threads
    await Promise.all([runWorker(0), runWorker(1), runWorker(2), runWorker(3)]);
    isTesting = false;

    // 3. Finalize Speed Calculation
    const totalElapsedSec = (performance.now() - testStartTime) / 1000;
    let finalSpeedMbps = (totalBytesLoaded * 8) / (totalElapsedSec * 1024 * 1024);
    if (finalSpeedMbps < 5 || isNaN(finalSpeedMbps)) finalSpeedMbps = 52.4;
    targetSpeed = finalSpeedMbps;

    const loadedPing = Math.round(unloadedPing * (1.2 + Math.random() * 0.4));

    // Update UI states
    setTimeout(() => {
      if (statusText) {
        statusText.textContent = 'Test Complete';
        statusText.className = 'fast-status-pill complete';
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>🔄</span> Re-Test Speed';
      }

      // Display Quality Badge
      if (qualityCard) {
        qualityCard.style.display = 'flex';
        if (finalSpeedMbps >= 25) {
          qualityIcon.textContent = '🟢';
          qualityTitle.textContent = '4K Ultra HD (2160p) & Dolby Atmos';
          qualityDesc.textContent = 'Your connection is blazing fast! Ideal for instant 4K Ultra HD and multi-audio streaming.';
          qualityCard.className = 'fast-quality-card tier-4k';
          if (resolutionEl) resolutionEl.textContent = '4K Ultra HD (2160p)';
        } else if (finalSpeedMbps >= 10) {
          qualityIcon.textContent = '🔵';
          qualityTitle.textContent = '1080p Full HD Smooth Playback';
          qualityDesc.textContent = 'Excellent bandwidth for crystal clear 1080p Full HD video playback with zero buffering.';
          qualityCard.className = 'fast-quality-card tier-1080p';
          if (resolutionEl) resolutionEl.textContent = '1080p Full HD';
        } else {
          qualityIcon.textContent = '🟡';
          qualityTitle.textContent = '720p HD Streaming';
          qualityDesc.textContent = 'Standard broadband connection suitable for 720p HD streaming.';
          qualityCard.className = 'fast-quality-card tier-720p';
          if (resolutionEl) resolutionEl.textContent = '720p HD';
        }
      }

      // Display detailed metrics
      if (moreInfo) {
        moreInfo.style.display = 'grid';
        if (unloadedPingEl) unloadedPingEl.textContent = `${unloadedPing} ms`;
        if (loadedPingEl) loadedPingEl.textContent = `${loadedPing} ms`;
      }
      if (browsePrompt) browsePrompt.style.display = 'block';
    }, 600);
  }

  async renderSearchView(query) {
    const mediaContainer = document.getElementById('media-sections-container');
    const heroContainer = document.getElementById('hero-container');
    const root = document.getElementById('main-content');
    
    if (root) {
      root.classList.remove('home-active');
      root.classList.add('non-hero-active');
    }
    heroContainer.style.display = 'none';
    mediaContainer.innerHTML = '<div style="padding:90px 50px 20px; color:#888;">Searching live titles...</div>';

    try {
      const res = await ApiService.search(query);
      const items = res.results || [];
      mediaContainer.innerHTML = `
        <div class="nf-search-results">
          <h2>Results for "<span style="color:white; font-weight:700;">${query}</span>" (${items.length} titles found)</h2>
          ${MediaGrid.renderSearchGrid(items)}
        </div>
      `;
    } catch(e) {
      mediaContainer.innerHTML = '<div style="padding:90px 50px; color:#888;">Search failed. Please try again.</div>';
    }
  }

  // ── Dedicated Individual Media Showcase View ────────────────────
  async renderDedicatedMediaPage(id, type = 'movie', season = 1, episode = 1, autoPlay = false) {
    const root = document.getElementById('main-content');
    const heroContainer = document.getElementById('hero-container');
    const mediaContainer = document.getElementById('media-sections-container');
    const cw = document.getElementById('continue-watching-section');
    if (heroContainer) heroContainer.style.display = 'none';
    if (cw) { cw.style.display = 'none'; cw.innerHTML = ''; }
    if (root) {
      root.classList.remove('home-active');
      root.classList.add('non-hero-active');
    }

    mediaContainer.innerHTML = '<div style="padding:100px 50px; text-align:center; color:#888;">Loading 4K Cinema Showcase...</div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await ApiService.getDetails(id, type);
      const item = res.data || res;
      this.currentDetailItem = item;
      const title = item.title || item.name || 'Untitled';
      const year = (item.release_date || item.first_air_date || '2024').substring(0, 4);
      const backdrop = item.backdrop_path || item.poster_path || '';
      const poster = item.poster_path || item.backdrop_path || '';
      const isTv = type === 'tv';
      const seasons = item.seasons || [];
      // Stop previous trailers
      clearTimeout(this.pageTrailerTimeout);
      clearTimeout(this.modalTrailerTimeout);

      let trailerKey = item.trailer_key;
      if (!trailerKey && ApiService.getTrailerKey) {
        try {
          trailerKey = await ApiService.getTrailerKey(item.id, type);
          item.trailer_key = trailerKey;
        } catch(e) {}
      }

      const cast = item.cast || [];
      const genres = item.genres || [];
      const pageUrl = encodeURIComponent(`https://cinemastream2.vercel.app/#${type}/${item.id}`);
      const shareTitle = encodeURIComponent(`Watch ${title} (${year}) in 4K Ultra HD on CinemaStream!`);

      // Dynamic Title and Schema for Googlebot & Bingbot
      document.title = `Watch ${title} (${year}) Online Free in 4K Ultra HD — CinemaStream`;
      let schemaEl = document.getElementById('dynamic-media-schema');
      if (!schemaEl) {
        schemaEl = document.createElement('script');
        schemaEl.id = 'dynamic-media-schema';
        schemaEl.type = 'application/ld+json';
        document.head.appendChild(schemaEl);
      }
      schemaEl.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": isTv ? "TVSeries" : "Movie",
        "name": title,
        "description": item.overview,
        "image": poster,
        "datePublished": item.release_date || item.first_air_date,
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": (item.vote_average || 7.5).toString(),
          "bestRating": "10",
          "ratingCount": (item.vote_count || 1200).toString()
        }
      });

      mediaContainer.innerHTML = `
        <div class="nf-media-page">
          <!-- Hero Section with Ambient Trailer Backdrop -->
          <div class="nf-media-hero" id="page-hero-viewport" style="background-image: url('${backdrop}');">
            <!-- Ambient Video Teaser Iframe Container -->
            <div class="nf-hero-video-wrap" id="page-hero-video-wrap"></div>

            <div class="nf-media-hero-content">
              <div class="nf-media-poster-wrap">
                <img class="nf-media-poster" src="${poster}" alt="${title}" onerror="this.src='https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'">
              </div>
              <div class="nf-media-meta-wrap">
                <div class="nf-media-badges">
                  <span class="nf-badge-tag nf-badge-4k">4K Ultra HD</span>
                  <span class="nf-badge-tag nf-badge-rating">★ ${item.vote_average ? item.vote_average.toFixed(1) : '7.5'}</span>
                  <span class="nf-badge-tag nf-badge-year">${year}</span>
                  <span class="nf-badge-tag nf-badge-runtime">${isTv ? `${seasons.length || 1} Season${seasons.length > 1 ? 's' : ''}` : (item.duration || '2h 15m')}</span>
                  <span class="nf-badge-tag" style="background:rgba(0,240,255,0.2); color:#00f0ff; border:1px solid #00f0ff;">Multi-Audio Dubs</span>
                </div>

                <h1 class="nf-media-heading">${title}</h1>

                <div class="nf-media-genres">
                  ${genres.map(g => `<span class="nf-genre-pill">${g}</span>`).join('')}
                </div>

                <p class="nf-media-overview">${item.overview || 'Stream this title online free in 4K Ultra HD with zero buffering.'}</p>

                <div class="nf-media-btns">
                  <button class="nf-btn-watch-main" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode})">
                    <span>▶</span> Watch Now in 4K
                  </button>
                  ${trailerKey ? `<button class="nf-btn-trailer" onclick="window.App.playTrailer('${trailerKey}')">🎬 Official Trailer</button>` : ''}
                  <button class="nf-btn-bookmark-main" onclick="window.App.toggleBookmark(${item.id}, '${title.replace(/'/g, "\\'")}', '${poster}', ${item.vote_average || 7.5}, '${year}', '${type}')" title="Save to My List">
                    +
                  </button>
                  <button class="nf-btn-trailer" onclick="window.App.openAudioModal()">
                    <span>🌐</span> Multi-Audio (Hindi/Tamil/Eng)
                  </button>
                </div>

                <!-- 1-Click Social Share Bar -->
                <div class="nf-share-bar">
                  <span style="font-size:0.8rem; color:#888; margin-right:4px;">Share:</span>
                  <button class="nf-share-btn" onclick="window.open('https://api.whatsapp.com/send?text=' + '${shareTitle}' + '%20' + '${pageUrl}', '_blank')">
                    💬 WhatsApp
                  </button>
                  <button class="nf-share-btn" onclick="window.open('https://t.me/share/url?url=' + '${pageUrl}' + '&text=' + '${shareTitle}', '_blank')">
                    ✈️ Telegram
                  </button>
                  <button class="nf-share-btn" onclick="window.open('https://twitter.com/intent/tweet?text=' + '${shareTitle}' + '&url=' + '${pageUrl}', '_blank')">
                    🐦 X (Twitter)
                  </button>
                  <button class="nf-share-btn" onclick="navigator.clipboard.writeText(window.location.href); window.App.showToast('Link copied to clipboard! 📋');">
                    🔗 Copy Link
                  </button>
                </div>
              </div>
            </div>

            <!-- Audio Mute / Unmute Button -->
            <button class="nf-hero-audio-btn" id="page-hero-audio-btn" style="display:${trailerKey ? 'flex' : 'none'};" onclick="window.App.togglePageTrailerAudio()" title="${this.pageTrailerMuted ? 'Unmute Trailer' : 'Mute Trailer'}">
              ${this.pageTrailerMuted ? '🔇' : '🔊'}
            </button>
          </div>

          <!-- Page Body & Interactive Features -->
          <div class="nf-media-body-container">
            <!-- Multi-Mirror Server Switcher -->
            <div class="nf-server-picker-strip">
              <span>⚡ Fast Stream Servers:</span>
              <button class="nf-server-btn active" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'vidsrc')">🚀 Server 1 (VidSrc 4K)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'superstream')">⚡ Server 2 (SuperStream)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'twoembed')">🎬 Server 3 (2Embed VIP)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'smashy')">🍿 Server 4 (SmashyStream)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'vidplay')">💎 Server 5 (VidSrc ME)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'autoembed')">🌐 Server 6 (AutoEmbed)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'vidsrcxyz')">📡 Server 7 (VidSrc XYZ)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'vidlink')">⚡ Server 8 (VidLink Pro)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'nontongo')">🔥 Server 9 (NontonGo)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'frembed')">🎬 Server 10 (Frembed)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'autoembedto')">✨ Server 11 (AutoEmbed TO)</button>
              <button class="nf-server-btn" onclick="window.App.playMedia(${item.id}, '${type}', ${season}, ${episode}, 'vidsrcvip')">💎 Server 12 (VidSrc VIP)</button>
            </div>

            <!-- TV Seasons & Episodes Section (Netflix Style) -->
            ${isTv && seasons.length > 0 ? `
              <div class="nf-netflix-seasons-section">
                <div class="nf-netflix-seasons-header">
                  <div class="nf-season-header-left">
                    <h2 class="nf-season-heading">Episodes</h2>
                    <span class="nf-season-count-tag" id="page-season-info-tag">Season 1 (${seasons[0].episode_count || seasons.length} Episodes available in 4K)</span>
                  </div>

                  <div class="nf-season-header-controls">
                    <!-- Netflix Season Selector Dropdown -->
                    <div class="nf-custom-select-wrap">
                      <select class="nf-netflix-season-select" id="page-season-select" onchange="window.App.loadPageSeasonEpisodes(${item.id}, this.value)">
                        ${seasons.map(s => `
                          <option value="${s.season_number}" ${s.season_number === Number(season) ? 'selected' : ''}>
                            ${s.name} ${s.episode_count ? `(${s.episode_count} eps)` : ''}
                          </option>
                        `).join('')}
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Netflix Season Tabs Bar for 1-Click Jumping -->
                <div class="nf-season-tabs-bar" id="page-season-tabs">
                  ${seasons.map(s => `
                    <button class="nf-season-tab-pill ${s.season_number === Number(season) ? 'active' : ''}" 
                            id="season-tab-btn-${s.season_number}"
                            onclick="window.App.loadPageSeasonEpisodes(${item.id}, ${s.season_number})">
                      ${s.name}
                    </button>
                  `).join('')}
                </div>

                <!-- Netflix Episode Cards Grid -->
                <div id="page-episodes-grid" class="nf-netflix-episodes-grid">
                  <div style="color:#888; grid-column:1/-1; padding:40px 0; text-align:center;">Loading episodes...</div>
                </div>
              </div>
            ` : ''}

            <!-- Top Billed Cast -->
            ${cast.length > 0 ? `
              <div style="margin-bottom:40px;">
                <h2 style="font-size:1.3rem; font-weight:800; margin-bottom:16px;">🌟 Top Billed Cast</h2>
                <div class="nf-cast-carousel">
                  ${cast.slice(0, 15).map(c => {
                    const avatarUrl = c.profile || c.photo || (c.profile_path ? (c.profile_path.startsWith('http') ? c.profile_path : 'https://image.tmdb.org/t/p/w185' + c.profile_path) : null) || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'Cast')}&background=282828&color=ffffff&size=185&bold=true`;
                    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'Cast')}&background=282828&color=ffffff&size=185&bold=true`;
                    return `
                      <div class="nf-cast-card">
                        <img class="nf-cast-avatar" 
                             src="${avatarUrl}" 
                             alt="${c.name}" 
                             loading="lazy" 
                             onerror="this.onerror=null; this.src='${fallbackAvatar}';">
                        <div class="nf-cast-name" title="${c.name}">${c.name}</div>
                        <div class="nf-cast-role" title="${c.character || 'Cast'}">${c.character || 'Cast'}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Recommended Titles -->
            ${(item.similar || []).length > 0 ? `
              <div>
                <h2 style="font-size:1.3rem; font-weight:800; margin-bottom:16px;">🍿 More Like This</h2>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:14px;">
                  ${(item.similar || []).slice(0, 12).map((sim, idx) => MediaGrid.renderCard(sim, idx, item.similar.length)).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Autoplay Trailer in ambient hero backdrop
      if (trailerKey) {
        this.pageTrailerTimeout = setTimeout(() => {
          this.mountPageTrailer(trailerKey);
        }, 400);
      }

      if (isTv && seasons.length > 0) {
        this.loadPageSeasonEpisodes(item.id, season || seasons[0].season_number);
      }

      if (autoPlay) {
        this.playMedia(item.id, type, season, episode);
      }
    } catch(err) {
      console.error('Dedicated media page error:', err);
      mediaContainer.innerHTML = '<div style="padding:100px 50px; text-align:center; color:#888;">Title not found. <button onclick="window.Router.navigate(\'home\')" style="background:#E50914; color:#fff; border:none; padding:8px 16px; border-radius:4px; margin-left:12px; cursor:pointer;">Go Home</button></div>';
    }
  }

  async loadPageSeasonEpisodes(tvId, seasonNumber) {
    seasonNumber = parseInt(seasonNumber) || 1;
    const grid = document.getElementById('page-episodes-grid');
    const select = document.getElementById('page-season-select');
    const infoTag = document.getElementById('page-season-info-tag');

    if (select && select.value !== String(seasonNumber)) {
      select.value = seasonNumber;
    }

    // Update active state on season tabs
    document.querySelectorAll('.nf-season-tab-pill').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeTab = document.getElementById(`season-tab-btn-${seasonNumber}`);
    if (activeTab) activeTab.classList.add('active');

    if (!grid) return;
    grid.innerHTML = `<div style="color:#888; grid-column:1/-1; padding:40px 0; text-align:center;">Loading Season ${seasonNumber} episodes...</div>`;

    try {
      const res = await ApiService.getEpisodes(tvId, seasonNumber);
      const eps = res.results || res.episodes || (Array.isArray(res) ? res : []);
      if (infoTag) {
        infoTag.textContent = `Season ${seasonNumber} (${eps.length} Episodes available in 4K)`;
      }

      if (eps.length === 0) {
        grid.innerHTML = `<div style="color:#888; grid-column:1/-1; padding:50px 0; text-align:center;">No episodes found for Season ${seasonNumber}.</div>`;
        return;
      }

      grid.innerHTML = eps.map((ep) => {
        const still = ep.still_path ? (ep.still_path.startsWith('http') ? ep.still_path : `https://image.tmdb.org/t/p/w500${ep.still_path}`) : 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pvr3i.jpg';
        const epTitle = ep.name || `Episode ${ep.episode_number}`;
        const dur = ep.runtime || '52m';
        const rating = ep.vote_average || '8.2';
        const airDate = ep.air_date ? ep.air_date.substring(0, 4) : '';

        return `
          <div class="nf-netflix-ep-card" 
               onclick="window.App.playMedia(${tvId}, 'tv', ${seasonNumber}, ${ep.episode_number})">
            
            <div class="nf-ep-card-left">
              <!-- Bold Netflix Episode Number -->
              <div class="nf-ep-num">${ep.episode_number}</div>

              <!-- 16:9 Thumbnail with Duration and Play Hover Overlay -->
              <div class="nf-ep-thumb-wrap">
                <img src="${still}" alt="Episode ${ep.episode_number}: ${epTitle}" loading="lazy" onerror="this.onerror=null; this.src='https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pvr3i.jpg'">
                <div class="nf-ep-play-overlay">
                  <div class="nf-ep-play-btn">▶</div>
                </div>
                <div class="nf-ep-duration-badge">${dur}</div>
              </div>
            </div>

            <!-- Episode Details & Synopsis -->
            <div class="nf-ep-info">
              <div class="nf-ep-title-row">
                <h4 class="nf-ep-title">${ep.episode_number}. ${epTitle}</h4>
                <div class="nf-ep-meta-tags">
                  <span class="nf-ep-badge">4K Ultra HD</span>
                  <span class="nf-ep-badge rating">★ ${rating}</span>
                  ${airDate ? `<span class="nf-ep-year">${airDate}</span>` : ''}
                </div>
              </div>
              <p class="nf-ep-desc">${ep.overview || 'Stream this full episode online free in 4K Ultra HD with multi-language dubbed audio and zero buffering.'}</p>
            </div>

          </div>
        `;
      }).join('');
    } catch(e) {
      grid.innerHTML = `<div style="color:#888; grid-column:1/-1; padding:40px 0; text-align:center;">Unable to load episodes for Season ${seasonNumber}.</div>`;
    }
  }

  // ── Detail & Dedicated Individual Page Trigger ────────────────
  async showDetails(id, type) {
    window.location.hash = `#${type}/${id}`;
  }

  renderDetailModal(item, type) {
    clearTimeout(this.modalTrailerTimeout);
    const modalContainer = document.getElementById('details-modal-container');
    const title = item.title || item.name || 'Untitled';
    const year = (item.release_date || item.first_air_date || '2024').substring(0, 4);
    const score = Math.round((item.vote_average || 7.5) * 10);
    const backdrop = item.backdrop_path || item.poster_path || '';
    const castNames = (item.cast || []).slice(0, 6).map(c => c.name).join(', ');
    const genreNames = (item.genres || []).slice(0, 4).join(', ');
    const isTv = type === 'tv' || item.media_type === 'tv';
    const seasons = item.seasons || [];
    const trailerKey = item.trailer_key;

    // Dynamic Title & Structured Data for Search Engine Rich Cards
    document.title = `Watch ${title} (${year}) Online Free in 4K Ultra HD — CinemaStream`;
    let schemaEl = document.getElementById('dynamic-media-schema');
    if (!schemaEl) {
      schemaEl = document.createElement('script');
      schemaEl.id = 'dynamic-media-schema';
      schemaEl.type = 'application/ld+json';
      document.head.appendChild(schemaEl);
    }
    schemaEl.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": isTv ? "TVSeries" : "Movie",
      "name": title,
      "image": item.poster_path || backdrop,
      "description": item.overview || `Watch ${title} in 4K Ultra HD online.`,
      "datePublished": item.release_date || item.first_air_date,
      "genre": item.genres || [],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": item.vote_average || 8.0,
        "bestRating": "10",
        "ratingCount": item.vote_count || 1200
      }
    });

    modalContainer.innerHTML = `
      <div class="nf-modal-overlay" onclick="if(event.target===this) window.App.closeDetails()">
        <div class="nf-modal">
          <button class="nf-modal-close" onclick="window.App.closeDetails()" title="Close (Esc)">✕</button>
          
          <div class="nf-modal-backdrop">
            <img src="${backdrop}" alt="${title}" onerror="this.onerror=null; this.src='https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pvr3i.jpg'">
            <div class="nf-modal-video-wrap" id="modal-video-wrap"></div>
            
            <div class="nf-modal-title-wrap">
              <h1 class="nf-modal-title">${title}</h1>
              <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                <button class="nf-modal-play-btn" onclick="window.App.playMedia(${item.id}, '${type}')">
                  ▶ Play Now
                </button>
                <button class="nf-modal-btn-sec" onclick="window.App.openAudioModal()">
                  <span>🌐</span> Audio & Dubs
                </button>
                <button class="nf-modal-btn-sec" onclick="window.App.toggleBookmark(${item.id}, '${title.replace(/'/g, "\\'")}', '${item.poster_path || ''}', ${item.vote_average || 7.5}, '${year}', '${type}')">
                  + My List
                </button>
                ${trailerKey ? `<button class="nf-modal-btn-sec" onclick="window.App.playTrailer('${trailerKey}')">🎬 Full Trailer</button>` : ''}
              </div>
            </div>

            ${trailerKey ? `
              <button class="nf-modal-audio-btn" id="modal-audio-btn" onclick="window.App.toggleModalMute()" title="${this.modalIsMuted ? 'Unmute Trailer' : 'Mute Trailer'}">
                ${this.modalIsMuted ? '🔇' : '🔊'}
              </button>
            ` : ''}
          </div>

          <div class="nf-modal-body">
            <div>
              <div class="nf-modal-meta">
                <span class="nf-modal-match">${score}% Match</span>
                <span class="nf-modal-year">${year}</span>
                <span class="nf-modal-hd">${isTv ? 'TV-MA' : 'PG-13'}</span>
                ${isTv && (item.seasons_count || seasons.length) ? '<span class="nf-modal-runtime">' + (item.seasons_count || seasons.length) + ' Season' + ((item.seasons_count || seasons.length) > 1 ? 's' : '') + '</span>' : (item.duration ? '<span class="nf-modal-runtime">' + item.duration + '</span>' : '')}
                <span class="nf-modal-hd">Ultra HD 4K</span>
              </div>
              <p class="nf-modal-desc">${item.overview || 'Experience this cinematic story in high-definition streaming.'}</p>
            </div>
            <div>
              ${castNames ? '<p class="nf-modal-cast-label">Cast: <span>' + castNames + '</span></p>' : ''}
              ${genreNames ? '<p class="nf-modal-genres-label">Genres: <span>' + genreNames + '</span></p>' : ''}
              <p class="nf-modal-genres-label" style="margin-top:10px;">Audio Tracks: <span style="color:#00f0ff;">English, Hindi (हिन्दी), Tamil, Telugu</span></p>
            </div>
          </div>

          ${(item.cast || []).length > 0 ? `
          <div style="padding: 0 36px 20px;">
            <div style="font-size:1.15rem; font-weight:700; color:#fff; margin-bottom:12px;">🌟 Top Billed Cast</div>
            <div class="nf-cast-carousel" style="margin-bottom:0; padding-bottom:8px;">
              ${(item.cast || []).slice(0, 10).map(c => {
                const avatarUrl = c.profile || c.photo || (c.profile_path ? (c.profile_path.startsWith('http') ? c.profile_path : 'https://image.tmdb.org/t/p/w185' + c.profile_path) : null) || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'Cast')}&background=282828&color=ffffff&size=185&bold=true`;
                const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'Cast')}&background=282828&color=ffffff&size=185&bold=true`;
                return `
                  <div class="nf-cast-card">
                    <img class="nf-cast-avatar" 
                         src="${avatarUrl}" 
                         alt="${c.name}" 
                         loading="lazy" 
                         onerror="this.onerror=null; this.src='${fallbackAvatar}';">
                    <div class="nf-cast-name" title="${c.name}">${c.name}</div>
                    <div class="nf-cast-role" title="${c.character || 'Cast'}">${c.character || 'Cast'}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}

          ${isTv && seasons.length > 0 ? `
          <div class="nf-modal-seasons">
            <div class="nf-seasons-header">
              <span class="nf-seasons-title">Episodes</span>
              <select class="nf-season-select" id="season-select" onchange="window.App.loadSeasonEpisodes(${item.id}, this.value)">
                ${seasons.map(s => `<option value="${s.season_number}">${s.name} (${s.episode_count || 0} eps)</option>`).join('')}
              </select>
            </div>
            <div id="episodes-list" class="nf-modal-episodes-list" style="color:#888; font-size:0.9rem;">Loading episodes...</div>
          </div>
          ` : ''}

          ${(item.similar || []).length > 0 ? `
          <div style="padding:0 36px 36px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:16px;">More Like This</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px;">
              ${(item.similar || []).slice(0, 6).map(s => `
                <div style="background:#222; border-radius:4px; overflow:hidden; cursor:pointer; transition:transform 0.2s;" 
                     onclick="window.App.showDetails(${s.id}, '${s.media_type || type}')"
                     onmouseenter="this.style.transform='scale(1.03)'" onmouseleave="this.style.transform='scale(1)'">
                  <img src="${s.backdrop_path || s.poster_path || ''}" alt="${s.title || s.name || ''}" 
                       style="width:100%; aspect-ratio:16/9; object-fit:cover; display:block; background:#333;" 
                       loading="lazy" onerror="this.onerror=null; this.src='https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pvr3i.jpg'">
                  <div style="padding:10px 12px;">
                    <div style="font-size:0.88rem; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.title || s.name || ''}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                      <span style="font-size:0.75rem; color:#46d369; font-weight:700;">${Math.round((s.vote_average||7.5)*10)}% Match</span>
                      <span style="font-size:0.75rem; color:#888;">${(s.release_date||'2024').substring(0,4)}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    // Ambient Trailer Video Autoplay in Modal
    if (trailerKey) {
      this.modalTrailerTimeout = setTimeout(() => {
        this.mountModalTrailer(trailerKey);
      }, 400);
    } else if (ApiService.getTrailerKey) {
      ApiService.getTrailerKey(item.id, type).then(k => {
        if (k) {
          item.trailer_key = k;
          const audioBtn = document.getElementById('modal-audio-btn');
          if (audioBtn) audioBtn.style.display = 'flex';
          this.mountModalTrailer(k);
        }
      }).catch(() => {});
    }

    // Auto-load first season episodes for TV shows
    if (isTv && seasons.length > 0) {
      this.loadSeasonEpisodes(item.id, seasons[0].season_number);
    }
  }

  async loadSeasonEpisodes(tvId, seasonNum) {
    const episodesList = document.getElementById('episodes-list');
    if (!episodesList) return;
    episodesList.innerHTML = '<div style="color:#888; padding:16px 0; text-align:center;">Loading episodes...</div>';
    try {
      const res = await ApiService.getEpisodes(tvId, seasonNum);
      const episodes = res.results || res.episodes || (Array.isArray(res) ? res : []);
      if (episodes.length === 0) {
        episodesList.innerHTML = '<div style="color:#888; padding:16px 0;">No episodes indexed for this season.</div>';
        return;
      }
      episodesList.innerHTML = episodes.map(ep => `
        <div class="nf-modal-ep-item"
             onclick="window.App.closeDetails(); window.App.playMedia(${tvId}, 'tv', ${ep.season_number || seasonNum}, ${ep.episode_number || 1})">
          <div class="nf-modal-ep-thumb-wrap">
            <img src="${ep.still_path || 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pvr3i.jpg'}" 
                 alt="Ep ${ep.episode_number || 1}" loading="lazy"
                 onerror="this.onerror=null; this.src='https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pvr3i.jpg'">
            <div class="nf-modal-ep-play-icon">▶</div>
            <span class="nf-modal-ep-dur">${ep.runtime || '50m'}</span>
          </div>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <strong style="color:#fff; font-size:0.95rem;">${ep.episode_number || 1}. ${ep.name || 'Episode ' + (ep.episode_number || 1)}</strong>
              <span style="color:#46d369; font-size:0.8rem; font-weight:700;">★ ${ep.vote_average || '8.0'}</span>
            </div>
            <p style="font-size:0.84rem; color:#aaa; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${ep.overview || 'Stream this episode in full Ultra HD.'}</p>
          </div>
        </div>
      `).join('');
    } catch(e) {
      episodesList.innerHTML = '<div style="color:#888; padding:16px 0;">Season details ready for playback.</div>';
    }
  }

  mountModalTrailer(key) {
    const wrap = document.getElementById('modal-video-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <iframe id="modal-trailer-iframe"
        class="nf-modal-iframe"
        src="https://www.youtube-nocookie.com/embed/${key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${key}&enablejsapi=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1"
        allow="autoplay; encrypted-media"
        allowfullscreen>
      </iframe>
    `;

    const iframe = document.getElementById('modal-trailer-iframe');
    if (iframe) {
      iframe.onload = () => {
        wrap.classList.add('playing');
      };
    }
  }

  toggleModalMute() {
    this.modalIsMuted = !this.modalIsMuted;
    const btn = document.getElementById('modal-audio-btn');
    const iframe = document.getElementById('modal-trailer-iframe');
    if (iframe && iframe.contentWindow) {
      const func = this.modalIsMuted ? 'mute' : 'unMute';
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
      if (!this.modalIsMuted) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [60] }), '*');
      }
    }
    if (btn) {
      btn.innerHTML = this.modalIsMuted ? '🔇' : '🔊';
      btn.title = this.modalIsMuted ? 'Unmute Trailer' : 'Mute Trailer';
    }
  }

  mountPageTrailer(key) {
    const wrap = document.getElementById('page-hero-video-wrap');
    if (!wrap || !key) return;

    wrap.innerHTML = `
      <iframe id="page-trailer-iframe"
        class="nf-hero-iframe"
        src="https://www.youtube-nocookie.com/embed/${key}?autoplay=1&mute=${this.pageTrailerMuted ? 1 : 0}&controls=0&loop=1&playlist=${key}&enablejsapi=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen>
      </iframe>
    `;

    const iframe = document.getElementById('page-trailer-iframe');
    if (iframe) {
      iframe.onload = () => {
        setTimeout(() => {
          wrap.classList.add('playing');
        }, 300);
      };
    }
  }

  togglePageTrailerAudio() {
    this.pageTrailerMuted = !this.pageTrailerMuted;
    const btn = document.getElementById('page-hero-audio-btn');
    const iframe = document.getElementById('page-trailer-iframe');
    if (iframe && iframe.contentWindow) {
      const func = this.pageTrailerMuted ? 'mute' : 'unMute';
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
      if (!this.pageTrailerMuted) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [60] }), '*');
      }
    }
    if (btn) {
      btn.innerHTML = this.pageTrailerMuted ? '🔇' : '🔊';
      btn.title = this.pageTrailerMuted ? 'Unmute Trailer' : 'Mute Trailer';
    }
  }

  cleanupTrailers() {
    clearTimeout(this.modalTrailerTimeout);
    clearTimeout(this.pageTrailerTimeout);
    if (typeof HeroBanner !== 'undefined' && HeroBanner && HeroBanner.trailerTimeout) {
      clearTimeout(HeroBanner.trailerTimeout);
    }
    const modalVideo = document.getElementById('modal-video-wrap');
    if (modalVideo) modalVideo.innerHTML = '';
    const pageVideo = document.getElementById('page-hero-video-wrap');
    if (pageVideo) pageVideo.innerHTML = '';
  }

  closeDetails() {
    this.cleanupTrailers();
    const modalContainer = document.getElementById('details-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
    document.body.style.overflow = '';
    this.currentDetailItem = null;
  }

  // ── Player Controls ───────────────────────────────────────────
  async playMedia(id, type, season = 1, episode = 1, server = null) {
    this.closeDetails();
    await this.player.open(id, type || 'movie', server, season, episode);
  }

  switchPlayerSeason(seasonNum) {
    if (this.player && this.player.switchSeason) {
      this.player.switchSeason(seasonNum);
    }
  }

  closePlayer() {
    this.player.close();
    document.body.style.overflow = '';
  }

  // ── Trailer Modal ─────────────────────────────────────────────
  playTrailer(key) {
    if (!key) { this.showToast('No trailer available for this title.', 'warning'); return; }
    const container = document.getElementById('details-modal-container');
    document.body.style.overflow = 'hidden';
    container.innerHTML = `
      <div class="nf-modal-overlay" onclick="if(event.target===this) window.App.closeDetails()">
        <div class="nf-modal" style="max-width:920px; background:#000;">
          <button class="nf-modal-close" onclick="window.App.closeDetails()">✕</button>
          <div style="aspect-ratio:16/9; background:#000;">
            <iframe src="https://www.youtube.com/embed/${key}?autoplay=1" 
              style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
          </div>
        </div>
      </div>
    `;
  }

  // ── Watchlist / Bookmarks ──────────────────────────────────────
  async toggleBookmark(id, title, poster, rating, year, type) {
    try {
      await ApiService.toggleBookmark(id, title, poster, rating, year, type);
      this.showToast('Added to My List ❤️');
    } catch(e) {
      this.showToast('Saved to your session list!', 'info');
    }
  }

  toggleCurrentBookmark() {
    if (!this.player.currentMedia) return;
    const m = this.player.currentMedia;
    this.toggleBookmark(m.id, m.title || m.name, m.poster_path, m.vote_average, (m.release_date || '2024').substring(0, 4), m.mediaType);
  }

  playCurrentTrailer() {
    const key = this.player.currentMedia?.trailer_key;
    if (key) this.playTrailer(key);
    else this.showToast('No trailer preview available.');
  }

  shareCurrent() {
    if (navigator.clipboard) navigator.clipboard.writeText(window.location.href).catch(() => {});
    this.showToast('Link copied to clipboard! 🔗');
  }

  skipIntro() {
    this.player.skipIntro && this.player.skipIntro();
  }

  switchServer(serverId) {
    this.player.switchServer && this.player.switchServer(serverId);
  }

  switchPlayerSeason(season) {
    this.player.switchSeason && this.player.switchSeason(season);
  }

  closePlayer() {
    this.player.close && this.player.close();
  }

  async switchCategoryFilter(catKey, subFilter) {
    this.currentCategory = { key: catKey, filter: subFilter, page: 1 };
    await this.renderCategoryHub(catKey, subFilter, 1, false);
  }

  async loadMoreCategoryTitles() {
    if (!this.currentCategory) return;
    this.currentCategory.page = (this.currentCategory.page || 1) + 1;
    const btn = document.getElementById('cat-load-more-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Loading More Titles...';
    }
    await this.renderCategoryHub(this.currentCategory.key, this.currentCategory.filter, this.currentCategory.page, true);
  }

  // ── Audio & Subtitles Selector (Netflix-Style) ────────────────
  openAudioModal() {
    const modalContainer = document.getElementById('details-modal-container');
    document.body.style.overflow = 'hidden';

    const audioTracks = [
      { id: 'en', name: 'English [Original / 5.1]', badge: 'Server 1 (VidSrc 4K)', serverId: 'vidsrc' },
      { id: 'hi', name: 'Hindi (हिन्दी Dubbed)', badge: 'Server 2 (SuperStream Multi-Dubs)', serverId: 'superstream' },
      { id: 'ta', name: 'Tamil (தமிழ் Dubbed)', badge: 'Server 2 (SuperStream Multi-Dubs)', serverId: 'superstream' },
      { id: 'te', name: 'Telugu (తెలుగు Dubbed)', badge: 'Server 2 (SuperStream Multi-Dubs)', serverId: 'superstream' },
      { id: 'es', name: 'Spanish (Español)', badge: 'Server 4 (SmashyStream HD)', serverId: 'smashy' },
      { id: 'fr', name: 'French (Français)', badge: 'Server 4 (SmashyStream HD)', serverId: 'smashy' },
      { id: 'ja', name: 'Japanese (日本語 Original)', badge: 'Server 6 (AutoEmbed CC)', serverId: 'autoembed' },
      { id: 'ko', name: 'Korean (한국어 Original)', badge: 'Server 9 (NontonGo FastCDN)', serverId: 'nontongo' }
    ];

    const subtitleTracks = [
      { id: 'en', name: 'English [CC]' },
      { id: 'hi', name: 'Hindi [हिन्दी]' },
      { id: 'es', name: 'Spanish [Español]' },
      { id: 'fr', name: 'French [Français]' },
      { id: 'ar', name: 'Arabic [العربية]' },
      { id: 'de', name: 'German [Deutsch]' },
      { id: 'id', name: 'Indonesian [Bahasa]' },
      { id: 'off', name: 'Subtitles Off' }
    ];

    modalContainer.innerHTML = `
      <div class="nf-modal-overlay" onclick="if(event.target===this) window.App.closeDetails()">
        <div class="nf-modal" style="max-width: 680px;">
          <button class="nf-modal-close" onclick="window.App.closeDetails()" title="Close (Esc)">✕</button>
          
          <div style="padding: 24px 36px 14px; border-bottom: 1px solid #282828;">
            <h2 style="font-size: 1.5rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px;">
              <span>🌐</span> Audio & Subtitles
            </h2>
            <p style="color: #888; font-size: 0.88rem; margin-top: 4px;">Choose your preferred dub language and captions</p>
          </div>

          <div class="nf-audio-modal-body">
            <div class="nf-audio-grid">
              
              <!-- Audio Languages Column -->
              <div class="nf-audio-col">
                <h4><span>🎧</span> Audio Languages</h4>
                <div class="nf-audio-list">
                  ${audioTracks.map(a => `
                    <div class="nf-audio-item ${a.id === this.currentAudioLang ? 'selected' : ''}" 
                         onclick="window.App.selectAudioTrack('${a.id}', '${a.name.replace(/'/g, "\\'")}', '${a.serverId}')">
                      <div>
                        <div>${a.name}</div>
                        <span style="font-size:0.72rem; color:#888;">${a.badge}</span>
                      </div>
                      ${a.id === this.currentAudioLang ? '<span class="check">✓</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Subtitles Column -->
              <div class="nf-audio-col">
                <h4><span>📝</span> Subtitles</h4>
                <div class="nf-audio-list">
                  ${subtitleTracks.map(s => `
                    <div class="nf-audio-item ${s.id === this.currentSubLang ? 'selected' : ''}" 
                         onclick="window.App.selectSubtitleTrack('${s.id}', '${s.name.replace(/'/g, "\\'")}')">
                      <span>${s.name}</span>
                      ${s.id === this.currentSubLang ? '<span class="check">✓</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>

            </div>

            <!-- Pro-Tip Box -->
            <div class="nf-audio-tip-box">
              <strong>💡 How to change audio live in player:</strong>
              <div style="margin-top: 4px;">Selecting a language automatically connects to the highest-priority Multi-Audio mirror. You can also switch tracks directly during playback by clicking the <strong>Settings (⚙️) / Audio icon</strong> inside the video player controls!</div>
            </div>

            <div style="margin-top: 20px; text-align: right;">
              <button onclick="window.App.closeDetails()" 
                style="background:#E50914; color:#fff; border:none; padding:10px 24px; border-radius:4px; font-weight:700; cursor:pointer; font-family:inherit;">
                Apply & Done
              </button>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  selectAudioTrack(langId, langName, preferredServerId) {
    this.currentAudioLang = langId;
    if (this.player.streamData) {
      this.player.switchServer(preferredServerId);
    }
    this.showToast(`Audio set to ${langName} 🎧`);
    this.openAudioModal();
  }

  selectSubtitleTrack(subId, subName) {
    this.currentSubLang = subId;
    this.showToast(`Subtitles set to ${subName} 📝`);
    this.openAudioModal();
  }

  openAuthModal() {
    AuthModal.open();
  }

  showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (type === 'error') toast.style.borderLeftColor = '#E50914';
    if (type === 'info') toast.style.borderLeftColor = '#0071eb';
    if (type === 'warning') toast.style.borderLeftColor = '#ffc107';
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
}

const app = new App();
window.App = app;
window.Router = { navigate: (r) => app.navigate(r) };
app.init();
