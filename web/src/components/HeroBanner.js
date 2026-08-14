export class HeroBanner {
  static currentIndex = 0;
  static items = [];
  static rotateInterval = null;

  static render(container, items) {
    if (!items || items.length === 0) return;
    this.items = items;
    this.currentIndex = 0;
    this.renderHero(container, items[0]);

    // Auto-cycle hero every 8 seconds
    clearInterval(this.rotateInterval);
    this.rotateInterval = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.items.length;
      this.renderHero(container, this.items[this.currentIndex]);
      this.updateDots();
    }, 8000);
  }

  static renderHero(container, item) {
    if (!item) return;
    const title = item.title || item.name || 'Untitled';
    const year = (item.release_date || item.first_air_date || '2024').substring(0, 4);
    const score = Math.round((item.vote_average || 7.5) * 10);
    const desc = item.overview || '';
    const backdrop = item.backdrop_path || '';
    const isTv = item.media_type === 'tv';
    const genreText = (item.genres || []).slice(0, 3).join(' • ');

    container.innerHTML = `
      <div class="nf-hero">
        <div class="nf-hero-backdrop" id="hero-backdrop" style="background-image: url('${backdrop}');"></div>
        <div class="nf-hero-content">
          <h1 class="nf-hero-title">${title}</h1>
          <div class="nf-hero-meta">
            <span class="nf-match-badge">${score}% Match</span>
            <span class="nf-hero-year">${year}</span>
            <span class="nf-hero-rating-badge">${isTv ? 'TV-MA' : 'PG-13'}</span>
            <span class="nf-hero-rating">${item.vote_average || '7.5'} ⭐</span>
          </div>
          <p class="nf-hero-desc">${desc}</p>
          <div class="nf-hero-actions">
            <button class="nf-btn-play" onclick="window.App.playMedia(${item.id}, '${item.media_type}')">
              ▶ Play
            </button>
            <button class="nf-btn-info" onclick="window.App.showDetails(${item.id}, '${item.media_type}')">
              ℹ More Info
            </button>
          </div>
          ${genreText ? '<p style="margin-top:12px;font-size:0.85rem;color:rgba(255,255,255,0.6);">' + genreText + '</p>' : ''}
        </div>
        <div class="nf-hero-dots" id="hero-dots">
          ${this.items.map((_, i) => `
            <button class="nf-hero-dot ${i === this.currentIndex ? 'active' : ''}" 
              onclick="HeroBanner.goTo(${i})"></button>
          `).join('')}
        </div>
      </div>
    `;
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
    }, 8000);
  }
}

window.HeroBanner = HeroBanner;
