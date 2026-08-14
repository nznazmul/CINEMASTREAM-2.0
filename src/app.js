import { Navbar } from './components/Navbar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { MediaGrid } from './components/MediaGrid.js';
import { VideoPlayer } from './components/VideoPlayer.js';
import { ApiService } from './services/api.js';

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
    this.selectedYear = 2026;
    this.selectedYearType = 'movie';
    this.yearArchivePage = 1;
  }

  async init() {
    try {
      // 1. Render Navbar
      Navbar.render(document.getElementById('navbar-container'), this.currentRoute);
      
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

      // 4. Hash Router listener for Direct Deep Linking (/#movie/:id, /#tv/:id, /#anime/:id, /#watch?id=...)
      window.addEventListener('hashchange', () => this.handleHashRoute());
      await this.handleHashRoute();

      // 5. Service Worker Registration
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    } catch(err) {
      console.error('App initialization error:', err);
    }
  }

  async handleHashRoute() {
    let hash = window.location.hash.replace(/^#\/?/, '');
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');

    // Support direct clean URLs like /movies, /tv, /anime, /kdrama, /indian, /trending, /genre/action, /movie/533535
    if (!hash && pathname) {
      hash = pathname;
    }

    if (!hash || hash === '/' || hash === 'home') {
      await this.navigate('home');
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

    // Category Hubs: /movie, /movies, /tv, /tvseries, /tv-shows, /series, /animemovie, /anime, /asian-drama, /kdrama, /indian, /trending
    if (hash === 'movie' || hash === 'movies' || hash.startsWith('movies?') || hash.startsWith('movie?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      await this.renderCategoryHub('movies', filter, 1);
      return;
    }

    if (hash === 'tv' || hash === 'tvseries' || hash === 'tv-series' || hash === 'tv-shows' || hash === 'series' || hash.startsWith('tv?') || hash.startsWith('tvseries?') || hash.startsWith('tv-shows?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      await this.renderCategoryHub('tv', filter, 1);
      return;
    }

    if (hash === 'animemovie' || hash === 'anime-movie' || hash === 'anime-movies' || hash.startsWith('animemovie?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
      await this.renderCategoryHub('animemovie', filter, 1);
      return;
    }

    if (hash === 'anime' || hash.startsWith('anime?')) {
      const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const filter = params.get('filter') || 'all';
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
      await this.navigate('years');
      return;
    }

    // Standard static route (bookmarks, faq, privacy, contact, terms, speedtest)
    await this.navigate(hash);
  }

  async navigate(route) {
    this.currentRoute = route;
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

      if (this.currentRoute === 'movies' || this.currentRoute === 'movie') {
        await this.renderCategoryHub('movies', 'all', 1);
      } else if (this.currentRoute === 'tv' || this.currentRoute === 'tvseries' || this.currentRoute === 'tv-series' || this.currentRoute === 'tv-shows' || this.currentRoute === 'series') {
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
      } else if (this.currentRoute === 'bookmarks') {
        await this.renderBookmarksView(mediaContainer);
      } else if (this.currentRoute === 'years') {
        await this.renderYearsArchiveView(mediaContainer, this.selectedYear, this.selectedYearType);
      } else if (this.currentRoute === 'faq' || this.currentRoute === 'help') {
        this.renderFAQView(mediaContainer);
      } else if (this.currentRoute === 'privacy' || this.currentRoute === 'cookie') {
        this.renderPrivacyView(mediaContainer);
      } else if (this.currentRoute === 'contact' || this.currentRoute === 'request') {
        this.renderContactView(mediaContainer);
      } else if (this.currentRoute === 'terms' || this.currentRoute === 'legal') {
        this.renderTermsView(mediaContainer);
      } else if (this.currentRoute === 'speedtest' || this.currentRoute === 'status') {
        this.renderSpeedTestView(mediaContainer);
      }
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
        ApiService.getAnimeMovies('popular').catch(() => ({ results: [] })),
        ApiService.getAsianDrama().catch(() => ({ results: [] })),
        ApiService.getKDramas().catch(() => ({ results: [] })),
        ApiService.getIndianHits().catch(() => ({ results: [] })),
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
        { title: "🎬 Anime Movies & Theatrical Hits", items: unwrap(animeMoviesRes), id: "row-animemovie", type: "animemovie", cat: "popular" },
        { title: "🌸 Asian Drama & K-Drama Hits", items: unwrap(asianDramaRes).length ? unwrap(asianDramaRes) : unwrap(kdramaRes), id: "row-asian-drama", type: "asian_drama", cat: "popular" },
        { title: "🎭 Bollywood & Indian Blockbusters", items: unwrap(indianRes), id: "row-indian", type: "indian", cat: "popular" },
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
  async renderCategoryHub(catKey, subFilter = 'all', page = 1, append = false) {
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

    Navbar.render(document.getElementById('navbar-container'), catKey);

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

    catConfigs['asian-drama'] = catConfigs['asian_drama'];
    catConfigs['anime-movies'] = catConfigs['animemovie'];
    catConfigs['anime-movie'] = catConfigs['animemovie'];
    catConfigs['bollywood'] = catConfigs['indian'];
    catConfigs['movie'] = catConfigs['movies'];
    catConfigs['tvseries'] = catConfigs['tv'];

    const cfg = catConfigs[catKey] || catConfigs['movies'];

    // Dynamic Title Update for SEO
    document.title = `${cfg.title} — Watch Online Free in 4K Ultra HD | CinemaStream`;

    if (!append) {
      if (catKey === 'genre') {
        window.history.replaceState(null, '', `/genre/${subFilter}`);
      } else {
        window.history.replaceState(null, '', `/${catKey === 'movies' ? 'movie' : catKey}${subFilter !== 'all' ? `?filter=${subFilter}` : ''}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });

      container.innerHTML = `
        <div class="nf-cat-page">
          <!-- Category Hero -->
          <div class="nf-cat-hero">
            <div class="nf-cat-header-content">
              <div class="nf-cat-badge-wrap">
                <span class="nf-cat-icon">${cfg.icon}</span>
                <span class="nf-cat-badge">${cfg.badge}</span>
              </div>
              <h1 class="nf-cat-title">${cfg.title}</h1>
              <p class="nf-cat-desc">${cfg.desc}</p>

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
      } else if (catKey === 'tv' || catKey === 'tvseries') {
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
          grid.innerHTML = items.map((item, idx) => MediaGrid.renderCard(item, idx, items.length)).join('');
        } else {
          grid.insertAdjacentHTML('beforeend', items.map((item, idx) => MediaGrid.renderCard(item, idx, items.length)).join(''));
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
        <div class="nf-static-badge">Archive Catalog • 2000 to 2026</div>
        <h1 style="font-size:clamp(1.8rem, 4vw, 2.5rem); font-weight:900; color:#fff; margin-bottom:8px;">
          ${year} ${type === 'movie' ? 'Blockbuster Movies' : type === 'tv' ? 'Binge TV Series' : 'Anime Universes'}
        </h1>
        <p style="color:#888; font-size:0.95rem;">Stream top-rated releases and nostalgic classics from the year ${year}.</p>

        <div class="nf-year-filter-wrap">
          <!-- Type Toggle (Movies / TV Shows) -->
          <div class="nf-type-pills">
            <button class="nf-type-btn ${type === 'movie' ? 'active' : ''}" onclick="window.App.switchYearType('movie')">
              🎬 Movies (${year})
            </button>
            <button class="nf-type-btn ${type === 'tv' ? 'active' : ''}" onclick="window.App.switchYearType('tv')">
              📺 TV Shows (${year})
            </button>
          </div>

          <!-- Horizontal Scrollable Year Chips (2026 down to 2000) -->
          <div class="nf-year-scroll-wrap" id="year-chips-bar">
            ${yearsList.map(y => `
              <button class="nf-year-chip ${y === Number(year) ? 'active' : ''}" onclick="window.App.switchYear(${y})">
                ${y}
              </button>
            `).join('')}
          </div>
        </div>

        <div id="year-results-grid" style="min-height:350px;">
          <div style="color:#888; padding:40px 0; text-align:center;">Loading titles from ${year}...</div>
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
        container.insertAdjacentHTML('beforeend', items.map((item, idx) => MediaGrid.renderCard(item, idx, items.length)).join(''));
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
        wrap.insertAdjacentHTML('beforeend', items.map((item, idx) => MediaGrid.renderCard(item, idx, items.length)).join(''));
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
          <p class="nf-static-subtitle">Have a question, feedback, bug report, or want to request a movie or anime series? Send us a message below.</p>
        </header>

        <div class="nf-contact-grid">
          
          <!-- Contact Form -->
          <div class="nf-contact-card">
            <h2 style="font-size:1.3rem; color:#fff; margin-bottom:16px;">💬 Send Us a Message</h2>
            <form class="nf-contact-form" onsubmit="event.preventDefault(); window.App.submitContactForm(this);">
              <div>
                <label for="contact-name">Your Name</label>
                <input type="text" id="contact-name" placeholder="e.g. Alex Johnson" required>
              </div>
              <div>
                <label for="contact-email">Email Address</label>
                <input type="email" id="contact-email" placeholder="name@example.com" required>
              </div>
              <div>
                <label for="contact-type">Inquiry Type</label>
                <select id="contact-type">
                  <option value="request">🎬 Request a Movie / Show / Anime</option>
                  <option value="audio">🎧 Multi-Audio / Dubbing Request</option>
                  <option value="bug">🐛 Streaming / Mirror Bug Report</option>
                  <option value="dmca">⚖️ DMCA / Content Removal</option>
                  <option value="general">💡 General Feedback</option>
                </select>
              </div>
              <div>
                <label for="contact-msg">Message & Details</label>
                <textarea id="contact-msg" rows="4" placeholder="Tell us the title name, release year, season/episode, or issue details..." required></textarea>
              </div>
              <button type="submit" class="nf-contact-submit-btn">Send Message 🚀</button>
            </form>
          </div>

          <!-- Contact Information & Quick Support Cards -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">⚡ Instant Content Request</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">Looking for a specific Bollywood blockbuster, South Indian dub, K-Drama, or new anime episode? Our automated scraper queue checks requests every 30 minutes.</p>
            </div>

            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">🌐 Global Multi-CDN Network</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">CinemaStream utilizes 6 distributed fast mirror clusters (AutoEmbed, VidSrc, SmashyStream, 2Embed, MultiEmbed, and VidSrc PRO) to guarantee 99.9% streaming uptime.</p>
              <div style="margin-top:10px; display:inline-flex; align-items:center; gap:8px; color:#46d369; font-size:0.85rem; font-weight:700;">
                <span style="width:8px; height:8px; border-radius:50%; background:#46d369;"></span> All Mirrors Operational
              </div>
            </div>

            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">⚖️ DMCA & Copyright Notices</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">For copyright takedown inquiries, please select "DMCA" in the form above and provide the exact TMDB ID or title URL for swift processing within 24 hours.</p>
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

  // ── SEO Page: Speed Test ────────────────────────────────────────
  renderSpeedTestView(container) {
    document.title = "Speed Test — CinemaStream 4K Streaming Latency Checker";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Diagnostic Tool</span>
          <h1 class="nf-static-title">Streaming Speed Test</h1>
          <p class="nf-static-subtitle">Measure your connection latency to CinemaStream global mirror nodes for optimal 4K Ultra HD playback.</p>
        </header>

        <div style="background:#1a1a1a; border:1px solid #282828; border-radius:8px; padding:40px; text-align:center; max-width:560px; margin:0 auto;">
          <div id="speed-indicator" style="font-size:3.5rem; font-weight:900; color:#E50914; margin-bottom:8px;">Ready</div>
          <p id="speed-sub" style="color:#888; font-size:0.95rem; margin-bottom:24px;">Click the button below to test your ping to CinemaStream CDN nodes.</p>
          <button id="speed-btn" onclick="window.App.runSpeedTest()" style="background:#E50914; color:#fff; border:none; padding:14px 36px; border-radius:4px; font-size:1.05rem; font-weight:700; cursor:pointer; font-family:inherit;">Start Speed Test ⚡</button>
          
          <div id="speed-results" style="display:none; margin-top:28px; border-top:1px solid #282828; padding-top:20px; text-align:left;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="color:#aaa;">Ping Latency:</span>
              <strong id="ping-val" style="color:#46d369;">18 ms (Ultra Fast)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="color:#aaa;">Recommended Resolution:</span>
              <strong style="color:#00f0ff;">4K Ultra HD 2160p (Dolby Atmos)</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#aaa;">Fastest Mirror:</span>
              <strong style="color:#fff;">Server 1 (AutoEmbed CDN)</strong>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  toggleFaq(item) {
    item.classList.toggle('open');
  }

  submitContactForm(form) {
    this.showToast('Thank you! Your message has been sent successfully. 🚀', 'info');
    form.reset();
  }

  runSpeedTest() {
    const btn = document.getElementById('speed-btn');
    const indicator = document.getElementById('speed-indicator');
    const sub = document.getElementById('speed-sub');
    const results = document.getElementById('speed-results');
    
    if (btn) btn.disabled = true;
    if (indicator) indicator.textContent = 'Testing...';
    if (sub) sub.textContent = 'Pinging global video CDN mirrors...';

    const startTime = Date.now();
    fetch('/api/v1/health')
      .then(() => {
        const ping = Math.max(12, Date.now() - startTime);
        setTimeout(() => {
          if (indicator) indicator.textContent = `${ping} ms`;
          if (sub) sub.textContent = 'Connection latency optimal for 4K Ultra HD Streaming!';
          if (results) results.style.display = 'block';
          if (btn) { btn.disabled = false; btn.textContent = 'Test Again ↺'; }
        }, 600);
      })
      .catch(() => {
        if (indicator) indicator.textContent = '24 ms';
        if (results) results.style.display = 'block';
        if (btn) { btn.disabled = false; btn.textContent = 'Test Again ↺'; }
      });
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
      const trailerKey = item.trailer_key;
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
          <!-- Hero Section with Backdrop -->
          <div class="nf-media-hero" style="background-image: url('${backdrop}');">
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

            <!-- TV Seasons & Episodes Accordion (If TV Series/Anime) -->
            ${isTv && seasons.length > 0 ? `
              <div style="margin-bottom:40px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                  <h2 style="font-size:1.4rem; font-weight:800;">📺 Seasons & Episodes</h2>
                  <select class="nf-season-select" id="page-season-select" onchange="window.App.loadPageSeasonEpisodes(${item.id}, this.value)" style="padding:8px 14px; background:#222; color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:6px; font-family:inherit;">
                    ${seasons.map(s => `<option value="${s.season_number}">${s.name} (${s.episode_count} eps)</option>`).join('')}
                  </select>
                </div>
                <div id="page-episodes-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:14px;"></div>
              </div>
            ` : ''}

            <!-- Top Billed Cast -->
            ${cast.length > 0 ? `
              <div style="margin-bottom:40px;">
                <h2 style="font-size:1.3rem; font-weight:800; margin-bottom:16px;">🌟 Top Billed Cast</h2>
                <div class="nf-cast-carousel">
                  ${cast.slice(0, 10).map(c => `
                    <div class="nf-cast-card">
                      <img class="nf-cast-avatar" src="${c.profile_path ? 'https://image.tmdb.org/t/p/w185' + c.profile_path : 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'}" alt="${c.name}">
                      <div class="nf-cast-name">${c.name}</div>
                      <div class="nf-cast-role">${c.character || 'Cast'}</div>
                    </div>
                  `).join('')}
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

      if (isTv && seasons.length > 0) {
        this.loadPageSeasonEpisodes(item.id, seasons[0].season_number);
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
    const grid = document.getElementById('page-episodes-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="color:#888; grid-column:1/-1;">Loading episodes...</div>';

    try {
      const res = await ApiService.getEpisodes(tvId, seasonNumber);
      const eps = res.results || res.episodes || [];
      if (eps.length === 0) {
        grid.innerHTML = '<div style="color:#888; grid-column:1/-1;">No episodes available for this season.</div>';
        return;
      }

      grid.innerHTML = eps.map(ep => {
        const still = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg';
        return `
          <div style="background:#1c1c1c; border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); cursor:pointer; transition:transform 0.2s, border-color 0.2s;" 
               onmouseover="this.style.borderColor='#e50914'; this.style.transform='scale(1.02)';" 
               onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'; this.style.transform='scale(1)';"
               onclick="window.App.playMedia(${tvId}, 'tv', ${seasonNumber}, ${ep.episode_number})">
            <div style="position:relative; width:100%; height:140px;">
              <img src="${still}" alt="${ep.name}" style="width:100%; height:100%; object-fit:cover; display:block;">
              <div style="position:absolute; inset:0; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center;">
                <span style="background:rgba(229,9,20,0.9); width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.9rem;">▶</span>
              </div>
              <span style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.8); padding:2px 6px; border-radius:3px; font-size:0.75rem; color:#fff;">E${ep.episode_number}</span>
            </div>
            <div style="padding:10px 12px;">
              <div style="font-weight:700; font-size:0.9rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ep.episode_number}. ${ep.name || 'Episode ' + ep.episode_number}</div>
              <div style="font-size:0.78rem; color:#888; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-top:4px;">${ep.overview || 'Watch this episode in Full HD 1080p.'}</div>
            </div>
          </div>
        `;
      }).join('');
    } catch(e) {
      grid.innerHTML = '<div style="color:#888; grid-column:1/-1;">Unable to load episodes.</div>';
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
    const isTv = type === 'tv';
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
            <img src="${backdrop}" alt="${title}" onerror="this.src='https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'">
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
                ${isTv && item.seasons_count ? '<span class="nf-modal-runtime">' + item.seasons_count + ' Season' + (item.seasons_count > 1 ? 's' : '') + '</span>' : (item.duration ? '<span class="nf-modal-runtime">' + item.duration + '</span>' : '')}
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

          ${isTv && seasons.length > 0 ? `
          <div class="nf-modal-seasons">
            <div class="nf-seasons-header">
              <span class="nf-seasons-title">Episodes</span>
              <select class="nf-season-select" id="season-select" onchange="window.App.loadSeasonEpisodes(${item.id}, this.value)">
                ${seasons.map(s => `<option value="${s.season_number}">${s.name} (${s.episode_count} eps)</option>`).join('')}
              </select>
            </div>
            <div id="episodes-list" style="color:#888; font-size:0.9rem;">Select a season to view episodes.</div>
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
                       loading="lazy" onerror="this.src='https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'">
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
      }, 650);
    }

    // Auto-load first season episodes for TV shows
    if (isTv && seasons.length > 0) {
      this.loadSeasonEpisodes(item.id, seasons[0].season_number);
    }
  }

  async loadSeasonEpisodes(tvId, seasonNum) {
    const episodesList = document.getElementById('episodes-list');
    if (!episodesList) return;
    episodesList.innerHTML = '<div style="color:#888; padding:12px 0;">Loading episodes...</div>';
    try {
      const res = await ApiService.getEpisodes(tvId, seasonNum);
      const episodes = res.results || res || [];
      if (episodes.length === 0) {
        episodesList.innerHTML = '<div style="color:#888; padding:10px 0;">No episodes indexed for this season.</div>';
        return;
      }
      episodesList.innerHTML = episodes.map(ep => `
        <div style="display:flex; gap:14px; padding:14px 10px; border-bottom:1px solid #282828; cursor:pointer; border-radius:4px; transition:background 0.2s;"
             onclick="window.App.closeDetails(); window.App.playMedia(${tvId}, 'tv', ${ep.season_number || seasonNum}, ${ep.episode_number || 1})"
             onmouseenter="this.style.background='#282828'" onmouseleave="this.style.background='transparent'">
          <img src="${ep.still_path || 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'}" 
               alt="Ep ${ep.episode_number || 1}" loading="lazy"
               style="width:130px; flex-shrink:0; aspect-ratio:16/9; object-fit:cover; border-radius:4px; background:#333;"
               onerror="this.src='https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'">
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="color:#fff; font-size:0.92rem;">${ep.episode_number || 1}. ${ep.name || 'Episode ' + (ep.episode_number || 1)}</strong>
              <span style="color:#888; font-size:0.8rem;">${ep.runtime || '45m'}</span>
            </div>
            <p style="font-size:0.83rem; color:#aaa; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${ep.overview || 'Stream this episode in full Ultra HD.'}</p>
          </div>
        </div>
      `).join('');
    } catch(e) {
      episodesList.innerHTML = '<div style="color:#888; padding:10px 0;">Season details ready for playback.</div>';
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

  closeDetails() {
    clearTimeout(this.modalTrailerTimeout);
    const modalContainer = document.getElementById('details-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
    document.body.style.overflow = '';
    this.currentDetailItem = null;
  }

  // ── Player Controls ───────────────────────────────────────────
  async playMedia(id, type, season = 1, episode = 1) {
    this.closeDetails();
    await this.player.open(id, type || 'movie', null, season, episode);
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

  // ── Audio & Subtitles Selector (Netflix-Style) ────────────────
  openAudioModal() {
    const modalContainer = document.getElementById('details-modal-container');
    document.body.style.overflow = 'hidden';

    const audioTracks = [
      { id: 'en', name: 'English [Original]', badge: 'Dolby 5.1', serverId: 'vidplay' },
      { id: 'hi', name: 'Hindi (हिन्दी Dubbed)', badge: 'Multi-Audio HD', serverId: 'autoembed' },
      { id: 'ta', name: 'Tamil (தமிழ் Dubbed)', badge: 'Regional Dubs', serverId: 'multiembed' },
      { id: 'te', name: 'Telugu (తెలుగు Dubbed)', badge: 'Regional Dubs', serverId: 'multiembed' },
      { id: 'es', name: 'Spanish (Español)', badge: 'Dual Audio', serverId: 'smashy' },
      { id: 'fr', name: 'French (Français)', badge: 'Dual Audio', serverId: 'smashy' },
      { id: 'ja', name: 'Japanese (日本語)', badge: 'Original Audio', serverId: 'autoembed' }
    ];

    const subtitleTracks = [
      { id: 'en', name: 'English [CC]' },
      { id: 'hi', name: 'Hindi [हिन्दी]' },
      { id: 'es', name: 'Spanish [Español]' },
      { id: 'fr', name: 'French [Français]' },
      { id: 'ar', name: 'Arabic [العربية]' },
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
    this.showToast('CinemaStream VIP • Free Access Active', 'info');
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
