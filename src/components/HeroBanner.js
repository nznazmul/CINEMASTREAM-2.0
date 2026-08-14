export class HeroBanner {
  static currentIndex = 0;
  static items = [];
  static rotateInterval = null;
  static trailerTimeout = null;
  static isMuted = true;
  static isHeroVisible = true;
  static scrollListenerAdded = false;

  static render(container, items) {
    if (!items || items.length === 0) return;
    this.items = items;
    this.currentIndex = 0;
    this.renderHero(container, items[0]);
    this.setupScrollListener();

    // Auto-cycle hero every 12 seconds
    clearInterval(this.rotateInterval);
    this.rotateInterval = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.items.length;
      this.renderHero(container, this.items[this.currentIndex]);
      this.updateDots();
    }, 12000);
  }

  static renderHero(container, item) {
    if (!item) return;
    clearTimeout(this.trailerTimeout);

    const title = (item.title || item.name || 'Untitled').replace(/"/g, '&quot;');
    const year = (item.release_date || item.first_air_date || '2024').substring(0, 4);
    const score = Math.round((item.vote_average || 7.5) * 10);
    const desc = item.overview || '';
    const backdrop = item.backdrop_path || 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg';
    const isTv = item.media_type === 'tv';
    const genreText = (item.genres || []).slice(0, 3).join(' • ');
    const trailerKey = item.trailer_key;

    container.innerHTML = `
      <div class="nf-hero" id="nf-hero-viewport">
        <!-- Static High-Res Poster Backdrop -->
        <div class="nf-hero-backdrop" id="hero-backdrop" style="background-image: url('${backdrop}');"></div>

        <!-- Ambient Video Teaser Iframe Container -->
        <div class="nf-hero-video-wrap" id="hero-video-wrap"></div>

        <!-- Hero Content Overlay -->
        <div class="nf-hero-content">
          <h1 class="nf-hero-title">${title}</h1>
          <div class="nf-hero-meta">
            <span class="nf-match-badge">${score}% Match</span>
            <span class="nf-hero-year">${year}</span>
            <span class="nf-hero-rating-badge">${isTv ? 'TV-MA' : 'PG-13'}</span>
            <span class="nf-hero-rating">${item.vote_average || '7.5'} ⭐</span>
            <span class="nf-hero-rating-badge" style="border-color:rgba(0,240,255,0.4); color:#00f0ff;">4K Ultra HD</span>
          </div>
          <p class="nf-hero-desc">${desc}</p>
          <div class="nf-hero-actions">
            <button class="nf-btn-play" onclick="window.App.playMedia(${item.id}, '${item.media_type || 'movie'}')">
              ▶ Play Now in 4K
            </button>
            <button class="nf-btn-info" onclick="window.App.showDetails(${item.id}, '${item.media_type || 'movie'}')">
              ℹ More Info
            </button>
          </div>
          ${genreText ? '<p style="margin-top:14px; font-size:0.85rem; color:rgba(255,255,255,0.6); font-weight:500;">' + genreText + '</p>' : ''}
        </div>

        <!-- Audio Mute / Unmute Button -->
        ${trailerKey ? `
          <button class="nf-hero-audio-btn" id="hero-audio-btn" onclick="HeroBanner.toggleMute()" title="${this.isMuted ? 'Unmute Teaser' : 'Mute Teaser'}">
            ${this.isMuted ? '🔇' : '🔊'}
          </button>
        ` : ''}

        <!-- Carousel Indicators -->
        <div class="nf-hero-dots" id="hero-dots">
          ${this.items.map((_, i) => `
            <button class="nf-hero-dot ${i === this.currentIndex ? 'active' : ''}" 
              onclick="HeroBanner.goTo(${i})"></button>
          `).join('')}
        </div>
      </div>
    `;

    // Ambient Video Teaser Autoplay after 1.2s delay
    if (trailerKey) {
      this.trailerTimeout = setTimeout(() => {
        this.mountTrailerVideo(trailerKey);
      }, 1200);
    }
  }

  static mountTrailerVideo(key) {
    const wrap = document.getElementById('hero-video-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <iframe id="hero-trailer-iframe"
        class="nf-hero-iframe"
        src="https://www.youtube-nocookie.com/embed/${key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${key}&enablejsapi=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1"
        allow="autoplay; encrypted-media"
        allowfullscreen>
      </iframe>
    `;

    const iframe = document.getElementById('hero-trailer-iframe');
    if (iframe) {
      iframe.onload = () => {
        wrap.classList.add('playing');
        if (!this.isHeroVisible) {
          this.pauseTeaser();
        }
      };
    }
  }

  static setupScrollListener() {
    if (this.scrollListenerAdded) return;
    this.scrollListenerAdded = true;

    let scrollTimeout = null;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY;
        
        // When user scrolls down past the hero (> 320px) -> PAUSE TEASER
        if (scrollY > 320 && this.isHeroVisible) {
          this.isHeroVisible = false;
          this.pauseTeaser();
        }
        // When user scrolls back up to top (<= 220px) -> RESUME TEASER
        else if (scrollY <= 220 && !this.isHeroVisible) {
          this.isHeroVisible = true;
          this.resumeTeaser();
        }
      }, 50);
    }, { passive: true });
  }

  static sendCommand(func, args = '') {
    const iframe = document.getElementById('hero-trailer-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: func,
        args: args ? [args] : []
      }), '*');
    }
  }

  static pauseTeaser() {
    this.sendCommand('pauseVideo');
    const wrap = document.getElementById('hero-video-wrap');
    if (wrap) wrap.style.opacity = '0';
  }

  static resumeTeaser() {
    this.sendCommand('playVideo');
    const wrap = document.getElementById('hero-video-wrap');
    if (wrap) wrap.style.opacity = '1';
  }

  static toggleMute() {
    this.isMuted = !this.isMuted;
    const btn = document.getElementById('hero-audio-btn');
    if (this.isMuted) {
      this.sendCommand('mute');
      if (btn) { btn.innerHTML = '🔇'; btn.title = 'Unmute Teaser'; }
    } else {
      this.sendCommand('unMute');
      this.sendCommand('setVolume', 60);
      if (btn) { btn.innerHTML = '🔊'; btn.title = 'Mute Teaser'; }
    }
  }

  static updateDots() {
    const dots = document.querySelectorAll('.nf-hero-dot');
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === this.currentIndex);
    });
  }

  static goTo(index) {
    clearInterval(this.rotateInterval);
    this.currentIndex = index;
    const container = document.getElementById('hero-container');
    if (container) this.renderHero(container, this.items[index]);
    this.rotateInterval = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.items.length;
      if (container) this.renderHero(container, this.items[this.currentIndex]);
      this.updateDots();
    }, 12000);
  }
}

window.HeroBanner = HeroBanner;
