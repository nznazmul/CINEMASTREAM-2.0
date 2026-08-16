import { NotificationCenter } from './NotificationCenter.js';

export class Navbar {
  static searchOpen = false;
  static searchTimeout = null;

  static render(container, route) {
    container.innerHTML = `
      <nav class="nf-navbar" id="nf-nav">
        <span class="nf-logo" onclick="window.Router.navigate('home')">CINEMASTREAM</span>
        <ul class="nf-nav-links">
          <li><a href="/movie" class="${route === 'movie' || route === 'movies' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('movie')">Movies</a></li>
          <li><a href="/tv-shows" class="${route === 'tv-shows' || route === 'tv-show' || route === 'tv' || route === 'tvseries' || route === 'series' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('tv-shows')">TV Shows</a></li>
          <li><a href="/anime" class="${route === 'anime' || route === 'animemovie' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('anime')">⛩️ Anime</a></li>
          <li><a href="/years" class="${route === 'years' || route === 'year' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('years')">📅 2000–2026</a></li>
          <li><a href="/mylist" class="${route === 'mylist' || route === 'bookmarks' || route === 'saved' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('mylist')">My List</a></li>
        </ul>
        <div class="nf-nav-right">
          <div class="nf-search-wrap" id="nf-search-wrap">
            <span class="nf-search-icon" onclick="Navbar.toggleSearch()" title="Search">🔍</span>
            <input type="text" class="nf-search-input" id="nf-search-input" placeholder="Titles, anime, genres..." 
              oninput="Navbar.handleSearch(this.value)"
              onkeydown="if(event.key==='Escape') Navbar.closeSearch()">
          </div>

          <!-- Release Radar / Notifications Link -->
          <div class="nf-bell-wrap" id="nf-bell-wrap">
            <button class="nf-bell-btn" id="nf-bell-trigger-btn" onclick="window.Router.navigate('notifications')" title="Release Radar & New Releases">
              <span class="nf-bell-icon">🔔</span>
              <span class="nf-bell-badge" id="nf-bell-badge" style="display:none;">0</span>
            </button>
          </div>

          <div class="nf-avatar" onclick="window.App.openAuthModal()" title="Account">CS</div>
        </div>
      </nav>

      <!-- Mobile Bottom Navigation Bar -->
      <nav class="nf-mobile-nav">
        <a class="nf-mobile-nav-item ${route === 'home' ? 'active' : ''}" onclick="window.Router.navigate('home')">
          <span class="icon">🏠</span>
          <span>Home</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'movie' || route === 'movies' ? 'active' : ''}" onclick="window.Router.navigate('movie')">
          <span class="icon">🎬</span>
          <span>Movies</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'tv-shows' || route === 'tv-show' || route === 'tv' || route === 'tvseries' ? 'active' : ''}" onclick="window.Router.navigate('tv-shows')">
          <span class="icon">📺</span>
          <span>TV</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'anime' || route === 'animemovie' ? 'active' : ''}" onclick="window.Router.navigate('anime')">
          <span class="icon">⛩️</span>
          <span>Anime</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'years' || route === 'year' ? 'active' : ''}" onclick="window.Router.navigate('years')">
          <span class="icon">📅</span>
          <span>2000–2026</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'mylist' || route === 'bookmarks' || route === 'saved' ? 'active' : ''}" onclick="window.Router.navigate('mylist')">
          <span class="icon">❤️</span>
          <span>Saved</span>
        </a>
      </nav>
    `;
    this.setupScrollEffect();

    // Initialize notification center
    if (NotificationCenter && NotificationCenter.loadNotifications) {
      NotificationCenter.loadNotifications();
      NotificationCenter.startAutoRefresh();
    }
  }

  static setupScrollEffect() {
    if (typeof document === 'undefined') return;
    const nav = document.getElementById('nf-nav');
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.removeEventListener('scroll', window._navScrollHandler);
    window._navScrollHandler = onScroll;
    window.addEventListener('scroll', onScroll);
    onScroll();
  }

  static toggleSearch() {
    const wrap = document.getElementById('nf-search-wrap');
    const input = document.getElementById('nf-search-input');
    if (!wrap) return;
    wrap.classList.toggle('open');
    if (wrap.classList.contains('open')) {
      input && input.focus();
    } else {
      if (input) input.value = '';
      window.App && window.App.renderCurrentView && window.App.renderCurrentView();
    }
  }

  static closeSearch() {
    const wrap = document.getElementById('nf-search-wrap');
    if (wrap) wrap.classList.remove('open');
    const input = document.getElementById('nf-search-input');
    if (input) input.value = '';
    window.App && window.App.renderCurrentView && window.App.renderCurrentView();
  }

  static handleSearch(query) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      if (query.trim().length > 1) {
        window.App && window.App.renderSearchView && window.App.renderSearchView(query.trim());
      } else if (!query.trim()) {
        window.App && window.App.renderCurrentView && window.App.renderCurrentView();
      }
    }, 300);
  }
}

if (typeof window !== 'undefined') {
  window.Navbar = Navbar;
}
