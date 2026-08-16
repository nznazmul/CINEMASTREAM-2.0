import { ApiService } from '../services/api.js';

export class NotificationCenter {
  static notifications = [];
  static activeFilter = 'all'; // 'all' | 'movie' | 'tv' | 'anime' | 'trending' | 'unread'
  static storageKey = 'cs_read_notifications';
  static isLoading = false;
  static _refreshInterval = null;

  static getReadIds() {
    try {
      if (typeof localStorage === 'undefined') return [];
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch (e) {
      return [];
    }
  }

  static saveReadIds(ids) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.storageKey, JSON.stringify(ids));
    } catch (e) {}
  }

  static formatPoster(posterPath) {
    if (!posterPath) return 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg';
    if (posterPath.startsWith('http')) return posterPath;
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  }

  static async loadNotifications(forceRefresh = false) {
    if (this.isLoading && !forceRefresh) return;
    this.isLoading = true;

    try {
      const [nowPlaying, onAir, trending, anime] = await Promise.all([
        ApiService.getMovies('now_playing', null, 1).catch(() => ({ results: [] })),
        ApiService.getTVSeries('on_the_air', null, 1).catch(() => ({ results: [] })),
        ApiService.getTrending(1).catch(() => ({ results: [] })),
        ApiService.getAnime('popular', 1).catch(() => ({ results: [] }))
      ]);

      const npItems = (nowPlaying.results || []).slice(0, 4).map((m, idx) => ({
        id: `movie_${m.id}`,
        mediaId: m.id,
        mediaType: 'movie',
        category: 'movie',
        typeLabel: '🎬 4K Premiere',
        title: m.title || m.name || 'Blockbuster Movie',
        year: (m.release_date || '2026').substring(0, 4),
        rating: m.vote_average ? Number(m.vote_average).toFixed(1) : '7.8',
        score: Math.round((m.vote_average || 7.8) * 10),
        desc: m.overview || 'Now streaming in 4K Ultra HD & Dolby Atmos 5.1 with multi-audio dubbed tracks.',
        poster: this.formatPoster(m.poster_path || m.poster || m.backdrop_path),
        time: idx === 0 ? 'Just now' : `${(idx + 1) * 20}m ago`,
        timestamp: Date.now() - 1000 * 60 * (idx * 20 + 5)
      }));

      const tvItems = (onAir.results || []).slice(0, 4).map((m, idx) => ({
        id: `tv_${m.id}`,
        mediaId: m.id,
        mediaType: 'tv',
        category: 'tv',
        typeLabel: '📺 New Episode Airing',
        title: m.name || m.title || 'TV Series',
        year: (m.first_air_date || '2024').substring(0, 4),
        rating: m.vote_average ? Number(m.vote_average).toFixed(1) : '8.2',
        score: Math.round((m.vote_average || 8.2) * 10),
        desc: m.overview || 'Fresh episode broadcast today with multi-language subtitle tracks and high-bitrate streaming.',
        poster: this.formatPoster(m.poster_path || m.poster || m.backdrop_path),
        time: `${idx + 1}h ago`,
        timestamp: Date.now() - 1000 * 60 * 60 * (idx + 1)
      }));

      const animeItems = (anime.results || []).slice(0, 3).map((m) => ({
        id: `anime_${m.id}`,
        mediaId: m.id,
        mediaType: 'tv',
        category: 'anime',
        typeLabel: '⛩️ Anime Simulcast',
        title: m.name || m.title || 'Anime Series',
        year: (m.first_air_date || '2024').substring(0, 4),
        rating: m.vote_average ? Number(m.vote_average).toFixed(1) : '8.5',
        score: Math.round((m.vote_average || 8.5) * 10),
        desc: m.overview || 'Simulcast release with original Japanese audio and multi-language dubs.',
        poster: this.formatPoster(m.poster_path || m.poster || m.backdrop_path),
        time: 'Today',
        timestamp: Date.now() - 1000 * 60 * 240
      }));

      const trendItems = (trending.results || []).slice(0, 3).map((m) => ({
        id: `trend_${m.id}`,
        mediaId: m.id,
        mediaType: m.media_type || 'movie',
        category: 'trending',
        typeLabel: '🔥 Trending Worldwide',
        title: m.title || m.name || 'Trending Hit',
        year: (m.release_date || m.first_air_date || '2024').substring(0, 4),
        rating: m.vote_average ? Number(m.vote_average).toFixed(1) : '7.9',
        score: Math.round((m.vote_average || 7.9) * 10),
        desc: m.overview || `Trending across global charts with ${Math.round((m.vote_average || 7.9) * 10)}% positive audience score.`,
        poster: this.formatPoster(m.poster_path || m.poster || m.backdrop_path),
        time: 'Yesterday',
        timestamp: Date.now() - 1000 * 60 * 600
      }));

      // Universal multi-tier deduplication
      const allRaw = [...npItems, ...tvItems, ...animeItems, ...trendItems];
      const seenNotif = new Set();
      const uniqueNotifs = [];
      for (const n of allRaw) {
        const key = `${n.mediaType}_${n.mediaId}`;
        const titleKey = (n.title || '').toLowerCase().trim();
        if (seenNotif.has(key) || (titleKey && seenNotif.has(titleKey))) continue;
        seenNotif.add(key);
        if (titleKey) seenNotif.add(titleKey);
        uniqueNotifs.push(n);
      }
      this.notifications = uniqueNotifs;
      this.updateBadge();
    } catch (e) {
      console.warn('Could not load notifications:', e);
    } finally {
      this.isLoading = false;
    }
  }

  static getUnreadCount() {
    const readIds = new Set(this.getReadIds());
    return this.notifications.filter(n => !readIds.has(n.id)).length;
  }

  static updateBadge() {
    if (typeof document === 'undefined') return;
    const badge = document.getElementById('nf-bell-badge');
    if (!badge) return;
    const count = this.getUnreadCount();
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.style.display = 'flex';
      badge.classList.add('pulse');
    } else {
      badge.style.display = 'none';
      badge.classList.remove('pulse');
    }
  }

  // Auto-refresh notifications every 5 minutes in background
  static startAutoRefresh() {
    if (this._refreshInterval) return;
    this._refreshInterval = setInterval(() => {
      this.loadNotifications(true);
    }, 5 * 60 * 1000);
  }

  static markAllAsRead() {
    const allIds = this.notifications.map(n => n.id);
    this.saveReadIds(allIds);
    this.updateBadge();
    if (typeof window !== 'undefined' && window.App) {
      window.App.showToast('All notifications marked as read! ✓');
      const container = document.getElementById('media-sections-container');
      if (container && window.App.currentRoute === 'notifications') {
        this.renderPage(container, this.activeFilter);
      }
    }
  }

  static markAsRead(id, e) {
    if (e) e.stopPropagation();
    const readIds = new Set(this.getReadIds());
    readIds.add(id);
    this.saveReadIds(Array.from(readIds));
    this.updateBadge();
    if (typeof window !== 'undefined' && window.App && window.App.currentRoute === 'notifications') {
      const container = document.getElementById('media-sections-container');
      if (container) this.renderPage(container, this.activeFilter);
    }
  }

  static openMedia(id, mediaId, mediaType, e) {
    if (e) e.stopPropagation();
    this.markAsRead(id);
    if (typeof window !== 'undefined' && window.App) {
      window.App.showDetails(mediaId, mediaType);
    }
  }

  static playMedia(id, mediaId, mediaType, e) {
    if (e) e.stopPropagation();
    this.markAsRead(id);
    if (typeof window !== 'undefined' && window.App) {
      window.App.playMedia(mediaId, mediaType);
    }
  }

  static async renderPage(container, filter = 'all') {
    this.activeFilter = filter;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div style="min-height:60vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;">
          <div class="nf-notif-spinner" style="width:36px; height:36px;"></div>
          <div style="color:#aaa; font-size:1.1rem; font-weight:600;">Scanning real-time release radar...</div>
        </div>
      `;
      await this.loadNotifications(true);
    }

    const readIds = new Set(this.getReadIds());
    const unreadCount = this.getUnreadCount();
    const totalCount = this.notifications.length;

    const movieCount = this.notifications.filter(n => n.category === 'movie').length;
    const tvCount = this.notifications.filter(n => n.category === 'tv').length;
    const animeCount = this.notifications.filter(n => n.category === 'anime').length;
    const trendCount = this.notifications.filter(n => n.category === 'trending').length;

    let filteredItems = this.notifications;
    if (filter === 'unread') {
      filteredItems = this.notifications.filter(n => !readIds.has(n.id));
    } else if (filter !== 'all') {
      filteredItems = this.notifications.filter(n => n.category === filter);
    }

    container.innerHTML = `
      <div class="nf-notif-page-wrap">
        
        <!-- Radar Hero Header -->
        <div class="nf-notif-page-hero">
          <div class="nf-notif-hero-content">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
              <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(229,9,20,0.15); border:1px solid rgba(229,9,20,0.4); padding:4px 12px; border-radius:20px;">
                <span class="nf-radar-beacon"></span>
                <span style="color:#ff3b47; font-size:0.8rem; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">Live Release Radar</span>
              </div>
              <button onclick="window.NotificationCenter && window.NotificationCenter.markAllAsRead()" class="nf-notif-mark-all-page-btn">
                ✓ Mark All as Read
              </button>
            </div>

            <h1 class="nf-notif-hero-title">New Releases & Updates</h1>
            <p class="nf-notif-hero-subtitle">
              Instant alerts on brand new 4K movie premieres in theaters, fresh TV series episodes, and Japanese anime simulcasts.
            </p>

            <!-- Interactive Category Filter Bar -->
            <div class="nf-notif-filter-bar">
              <button class="nf-notif-filter-pill ${filter === 'all' ? 'active' : ''}" 
                onclick="window.App.renderNotificationsView(document.getElementById('media-sections-container'), 'all')">
                🔥 All Releases <span class="pill-count">${totalCount}</span>
              </button>
              <button class="nf-notif-filter-pill ${filter === 'movie' ? 'active' : ''}" 
                onclick="window.App.renderNotificationsView(document.getElementById('media-sections-container'), 'movie')">
                🎬 4K Movies <span class="pill-count">${movieCount}</span>
              </button>
              <button class="nf-notif-filter-pill ${filter === 'tv' ? 'active' : ''}" 
                onclick="window.App.renderNotificationsView(document.getElementById('media-sections-container'), 'tv')">
                📺 TV Episodes <span class="pill-count">${tvCount}</span>
              </button>
              <button class="nf-notif-filter-pill ${filter === 'anime' ? 'active' : ''}" 
                onclick="window.App.renderNotificationsView(document.getElementById('media-sections-container'), 'anime')">
                ⛩️ Anime <span class="pill-count">${animeCount}</span>
              </button>
              <button class="nf-notif-filter-pill ${filter === 'trending' ? 'active' : ''}" 
                onclick="window.App.renderNotificationsView(document.getElementById('media-sections-container'), 'trending')">
                ⚡ Trending <span class="pill-count">${trendCount}</span>
              </button>
              <button class="nf-notif-filter-pill ${filter === 'unread' ? 'active' : ''}" 
                onclick="window.App.renderNotificationsView(document.getElementById('media-sections-container'), 'unread')">
                🔴 Unread <span class="pill-count" style="${unreadCount > 0 ? 'background:#e50914; color:#fff;' : ''}">${unreadCount}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Release Cards Feed -->
        <div class="nf-notif-feed-container">
          ${filteredItems.length === 0 ? `
            <div class="nf-notif-empty-card">
              <div style="font-size:3.5rem; margin-bottom:12px;">🎉</div>
              <h2 style="font-size:1.4rem; color:#fff; font-weight:800; margin-bottom:8px;">You're All Caught Up!</h2>
              <p style="color:#888; font-size:0.95rem; max-width:440px; margin-bottom:20px; line-height:1.5;">
                ${filter === 'unread' ? 'No unread notifications remaining. All newly added releases have been reviewed.' : 'No titles found in this filter category.'}
              </p>
              <button onclick="window.App.renderNotificationsView(document.getElementById('media-sections-container'), 'all')" class="fast-btn-primary">
                Browse All ${totalCount} Releases
              </button>
            </div>
          ` : `
            <div class="nf-notif-page-grid">
              ${filteredItems.map(item => {
                const isRead = readIds.has(item.id);
                return `
                  <div class="nf-notif-page-card ${isRead ? 'read' : 'unread'}" 
                       onclick="NotificationCenter.openMedia('${item.id}', ${item.mediaId}, '${item.mediaType}', event)">
                    
                    <div class="nf-notif-card-poster-wrap">
                      <img src="${item.poster}" alt="${item.title}" loading="lazy" onerror="this.src='https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'">
                      <span class="nf-notif-card-rating">★ ${item.rating}</span>
                      <span class="nf-notif-card-quality">4K UHD</span>
                    </div>

                    <div class="nf-notif-card-body">
                      <div class="nf-notif-card-top">
                        <span class="nf-notif-card-tag">${item.typeLabel}</span>
                        <span class="nf-notif-card-time">⏱️ ${item.time}</span>
                      </div>

                      <h3 class="nf-notif-card-title">${item.title} <span class="nf-notif-card-year">(${item.year})</span></h3>
                      <p class="nf-notif-card-desc">${item.desc}</p>

                      <div class="nf-notif-badges-row">
                        <span class="nf-notif-chip">4K HDR</span>
                        <span class="nf-notif-chip">Dolby Atmos 5.1</span>
                        <span class="nf-notif-chip">Multi-Audio</span>
                      </div>

                      <div class="nf-notif-card-actions" onclick="event.stopPropagation()">
                        <button class="nf-notif-act-play" onclick="NotificationCenter.playMedia('${item.id}', ${item.mediaId}, '${item.mediaType}', event)">
                          ▶ Watch in 4K
                        </button>
                        <button class="nf-notif-act-info" onclick="NotificationCenter.openMedia('${item.id}', ${item.mediaId}, '${item.mediaType}', event)">
                          ℹ Details
                        </button>
                        <button class="nf-notif-act-bookmark" onclick="window.App.toggleBookmark(${item.mediaId}, '${item.title.replace(/'/g, "\\'")}', '${item.poster}', ${item.rating}, '${item.year}', '${item.mediaType}')" title="Add to My List">
                          + My List
                        </button>
                        ${!isRead ? `
                          <button class="nf-notif-act-read" onclick="NotificationCenter.markAsRead('${item.id}', event)" title="Mark as Read">
                            ✓ Read
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>
    `;
  }
}

if (typeof window !== 'undefined') {
  window.NotificationCenter = NotificationCenter;
}
