export class Navbar {
  static searchOpen = false;
  static searchTimeout = null;

  static render(container, route) {
    container.innerHTML = `
      <nav class="nf-navbar" id="nf-nav">
        <span class="nf-logo" onclick="window.Router.navigate('home')">CINEMASTREAM</span>
        <ul class="nf-nav-links">
          <li><a href="/movies" class="${route === 'movies' || route === 'movie' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('movies')">Movies</a></li>
          <li><a href="/tv" class="${route === 'tv' || route === 'tvseries' || route === 'tv-shows' || route === 'series' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('tv')">TV Shows</a></li>
          <li><a href="/animemovie" class="${route === 'animemovie' || route === 'anime-movies' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('animemovie')">🎬 Anime Movies</a></li>
          <li><a href="/asian-drama" class="${route === 'asian_drama' || route === 'asian-drama' || route === 'kdrama' || route === 'kdramas' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('asian-drama')">🌸 Asian Drama</a></li>
          <li><a href="/indian" class="${route === 'indian' || route === 'bollywood' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('indian')">🎭 Indian Hits</a></li>
          <li><a href="/anime" class="${route === 'anime' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('anime')">⛩️ Anime TV</a></li>
          <li><a href="/years" class="${route === 'years' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('years')">📅 2000–2026</a></li>
          <li><a href="/bookmarks" class="${route === 'bookmarks' ? 'active' : ''}" onclick="event.preventDefault(); window.Router.navigate('bookmarks')">My List</a></li>
        </ul>
        <div class="nf-nav-right">
          <div class="nf-search-wrap" id="nf-search-wrap">
            <span class="nf-search-icon" onclick="Navbar.toggleSearch()" title="Search">🔍</span>
            <input type="text" class="nf-search-input" id="nf-search-input" placeholder="Titles, anime, genres..." 
              oninput="Navbar.handleSearch(this.value)"
              onkeydown="if(event.key==='Escape') Navbar.closeSearch()">
          </div>
          <span class="nf-bell" title="Notifications">🔔</span>
          <div class="nf-avatar" onclick="window.App.openAuthModal()" title="Account">CS</div>
        </div>
      </nav>

      <!-- Mobile Bottom Navigation Bar (Horizontally scrollable full bar) -->
      <nav class="nf-mobile-nav">
        <a class="nf-mobile-nav-item ${route === 'home' ? 'active' : ''}" onclick="window.Router.navigate('home')">
          <span class="icon">🏠</span>
          <span>Home</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'movies' || route === 'movie' ? 'active' : ''}" onclick="window.Router.navigate('movies')">
          <span class="icon">🎬</span>
          <span>Movies</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'animemovie' || route === 'anime-movies' ? 'active' : ''}" onclick="window.Router.navigate('animemovie')">
          <span class="icon">🍿</span>
          <span>Anime Movies</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'asian_drama' || route === 'asian-drama' || route === 'kdrama' ? 'active' : ''}" onclick="window.Router.navigate('asian-drama')">
          <span class="icon">🌸</span>
          <span>Drama</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'indian' || route === 'bollywood' ? 'active' : ''}" onclick="window.Router.navigate('indian')">
          <span class="icon">🎭</span>
          <span>Indian Hits</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'tv' || route === 'tvseries' ? 'active' : ''}" onclick="window.Router.navigate('tv')">
          <span class="icon">📺</span>
          <span>TV</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'anime' ? 'active' : ''}" onclick="window.Router.navigate('anime')">
          <span class="icon">⛩️</span>
          <span>Anime TV</span>
        </a>
        <a class="nf-mobile-nav-item ${route === 'bookmarks' ? 'active' : ''}" onclick="window.Router.navigate('bookmarks')">
          <span class="icon">❤️</span>
          <span>Saved</span>
        </a>
      </nav>
    `;
    this.setupScrollEffect();
  }

  static setupScrollEffect() {
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

window.Navbar = Navbar;
