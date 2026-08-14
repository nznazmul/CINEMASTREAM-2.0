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

      // 4. Initial Navigation
      await this.navigate('home');

      // 5. Service Worker Registration
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    } catch(err) {
      console.error('App initialization error:', err);
    }
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
    
    // Hide legacy category tabs in Netflix mode
    const categoryTabs = document.getElementById('category-tabs');
    if (categoryTabs) categoryTabs.style.display = 'none';

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

      if (this.currentRoute === 'movies') {
        await this.renderMoviesView(mediaContainer);
      } else if (this.currentRoute === 'tv') {
        await this.renderTVView(mediaContainer);
      } else if (this.currentRoute === 'anime') {
        await this.renderAnimeView(mediaContainer);
      } else if (this.currentRoute === 'bookmarks') {
        await this.renderBookmarksView(mediaContainer);
      }
    }
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
      html += MediaGrid.renderRow('🔥 Trending This Week', trending.results, 'row-trend');
    if ((nowPlaying.results || []).length > 0)
      html += MediaGrid.renderRow('🎬 Now Playing in Cinemas', nowPlaying.results, 'row-nowplaying');
    if ((movies.results || []).length > 0)
      html += MediaGrid.renderRow('🍿 Blockbuster Movies', movies.results, 'row-movies');
    if ((anime.results || []).length > 0)
      html += MediaGrid.renderRow('⛩️ Top Trending Anime Series', anime.results, 'row-anime-trend');
    if ((tv.results || []).length > 0)
      html += MediaGrid.renderRow('📺 Binge-Worthy TV Shows', tv.results, 'row-tv');
    if ((kdramas.results || []).length > 0)
      html += MediaGrid.renderRow('🇰🇷 Popular K-Dramas & Asian Series', kdramas.results, 'row-kdramas');
    if ((indian.results || []).length > 0)
      html += MediaGrid.renderRow('🇮🇳 Bollywood & Regional Blockbusters', indian.results, 'row-indian');
    if ((topRatedMovies.results || []).length > 0)
      html += MediaGrid.renderRow('⭐ All-Time Classic Movies', topRatedMovies.results, 'row-top-movies');
    if ((topRatedTV.results || []).length > 0)
      html += MediaGrid.renderRow('🏆 Critically Acclaimed Series', topRatedTV.results, 'row-top-tv');
    if ((onAir.results || []).length > 0)
      html += MediaGrid.renderRow('📡 Broadcast TV & On Air', onAir.results, 'row-onair');

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
    html += MediaGrid.renderRow('🔥 Popular Movies', popular.results || [], 'row-mov-popular');
    html += MediaGrid.renderRow('🎬 Now Playing', nowPlaying.results || [], 'row-mov-now');
    html += MediaGrid.renderRow('⭐ Critically Acclaimed', topRated.results || [], 'row-mov-top');
    html += MediaGrid.renderRow('🗓️ Upcoming Releases', upcoming.results || [], 'row-mov-upcoming');
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
    html += MediaGrid.renderRow('🔥 Popular Shows', popular.results || [], 'row-tv-popular');
    html += MediaGrid.renderRow('📡 Broadcast TV & On Air', onAir.results || [], 'row-tv-onair');
    html += MediaGrid.renderRow('📺 Airing Today', airingToday.results || [], 'row-tv-today');
    html += MediaGrid.renderRow('⭐ Top Rated Series', topRated.results || [], 'row-tv-top');
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
    html += MediaGrid.renderRow('🔥 Top Trending Anime', popularAnime.results || [], 'row-ani-popular');
    html += MediaGrid.renderRow('⭐ Masterpiece Anime (All-Time Top Rated)', topAnime.results || [], 'row-ani-top');
    html += MediaGrid.renderRow('⚔️ Action & Shonen Anime Hits', actionAnime.results || [], 'row-ani-action');
    html += MediaGrid.renderRow('🌸 Fantasy & Supernatural Anime', fantasyAnime.results || [], 'row-ani-fantasy');
    container.innerHTML = html;
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

  // ── Detail Modal (Netflix-Style Overview) ────────────────────────
  async showDetails(id, type) {
    const modalContainer = document.getElementById('details-modal-container');
    document.body.style.overflow = 'hidden';

    modalContainer.innerHTML = `
      <div class="nf-modal-overlay" onclick="if(event.target===this) window.App.closeDetails()">
        <div class="nf-modal">
          <div style="padding:80px; text-align:center; color:#888;">Loading details...</div>
        </div>
      </div>
    `;

    try {
      const res = await ApiService.getDetails(id, type);
      const item = res.data || res;
      this.currentDetailItem = item;
      this.renderDetailModal(item, type);
    } catch(e) {
      console.error('Detail error:', e);
      this.closeDetails();
      this.showToast('Unable to load title details.', 'error');
    }
  }

  renderDetailModal(item, type) {
    const modalContainer = document.getElementById('details-modal-container');
    const title = item.title || item.name || 'Untitled';
    const year = (item.release_date || item.first_air_date || '2024').substring(0, 4);
    const score = Math.round((item.vote_average || 7.5) * 10);
    const backdrop = item.backdrop_path || item.poster_path || '';
    const castNames = (item.cast || []).slice(0, 6).map(c => c.name).join(', ');
    const genreNames = (item.genres || []).slice(0, 4).join(', ');
    const isTv = type === 'tv';
    const seasons = item.seasons || [];

    modalContainer.innerHTML = `
      <div class="nf-modal-overlay" onclick="if(event.target===this) window.App.closeDetails()">
        <div class="nf-modal">
          <button class="nf-modal-close" onclick="window.App.closeDetails()" title="Close (Esc)">✕</button>
          
          <div class="nf-modal-backdrop">
            <img src="${backdrop}" alt="${title}" onerror="this.src='https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'">
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
                ${item.trailer_key ? `<button class="nf-modal-btn-sec" onclick="window.App.playTrailer('${item.trailer_key}')">🎬 Trailer</button>` : ''}
              </div>
            </div>
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
        episodesList.innerHTML = '<div style="color:#888;">No episodes found for this season.</div>';
        return;
      }
      episodesList.innerHTML = episodes.map(ep => `
        <div style="display:flex; gap:14px; padding:14px 10px; border-bottom:1px solid #282828; cursor:pointer; border-radius:4px; transition:background 0.2s;"
             onclick="window.App.closeDetails(); window.App.playMedia(${tvId}, 'tv', ${ep.season_number}, ${ep.episode_number})"
             onmouseenter="this.style.background='#282828'" onmouseleave="this.style.background='transparent'">
          <img src="${ep.still_path || 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'}" 
               alt="Ep ${ep.episode_number}" loading="lazy"
               style="width:130px; flex-shrink:0; aspect-ratio:16/9; object-fit:cover; border-radius:4px; background:#333;"
               onerror="this.src='https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'">
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="color:#fff; font-size:0.92rem;">${ep.episode_number}. ${ep.name || 'Episode ' + ep.episode_number}</strong>
              <span style="color:#888; font-size:0.8rem;">${ep.runtime || '45m'}</span>
            </div>
            <p style="font-size:0.83rem; color:#aaa; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${ep.overview || 'Stream this episode in full HD.'}</p>
          </div>
        </div>
      `).join('');
    } catch(e) {
      episodesList.innerHTML = '<div style="color:#888;">Failed to load episodes.</div>';
    }
  }

  closeDetails() {
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
app.init();
window.App = app;
window.Router = { navigate: (r) => app.navigate(r) };
