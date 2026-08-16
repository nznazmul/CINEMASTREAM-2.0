import { ApiService } from '../services/api.js';

export class NotificationCenter {
  static isOpen = false;
  static notifications = [];
  static activeTab = 'all'; // 'all' | 'unread'
  static storageKey = 'cs_read_notifications';
  static isLoading = false;

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
    if (!posterPath) return 'https://image.tmdb.org/t/p/w200/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg';
    if (posterPath.startsWith('http')) return posterPath.replace('/w500/', '/w200/');
    return `https://image.tmdb.org/t/p/w200${posterPath}`;
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

      const npItems = (nowPlaying.results || []).slice(0, 3).map((m, idx) => ({
        id: `movie_${m.id}`,
        mediaId: m.id,
        mediaType: 'movie',
        typeLabel: '🎬 4K Movie',
        title: m.title || m.name || 'Blockbuster Movie',
        desc: `Streaming in 4K Ultra HD & Dolby Atmos 5.1`,
        poster: this.formatPoster(m.poster_path || m.poster),
        time: idx === 0 ? 'Just now' : `${(idx + 1) * 20}m ago`,
        timestamp: Date.now() - 1000 * 60 * (idx * 20 + 5)
      }));

      const tvItems = (onAir.results || []).slice(0, 3).map((m, idx) => ({
        id: `tv_${m.id}`,
        mediaId: m.id,
        mediaType: 'tv',
        typeLabel: '📺 New Episode',
        title: m.name || m.title || 'TV Series',
        desc: `New episode with multi-language subs`,
        poster: this.formatPoster(m.poster_path || m.poster),
        time: `${idx + 1}h ago`,
        timestamp: Date.now() - 1000 * 60 * 60 * (idx + 1)
      }));

      const animeItems = (anime.results || []).slice(0, 2).map((m) => ({
        id: `anime_${m.id}`,
        mediaId: m.id,
        mediaType: 'tv',
        typeLabel: '⛩️ Anime',
        title: m.name || m.title || 'Anime Series',
        desc: `Simulcast in Japanese & Multi-Dubs`,
        poster: this.formatPoster(m.poster_path || m.poster),
        time: 'Today',
        timestamp: Date.now() - 1000 * 60 * 240
      }));

      const trendItems = (trending.results || []).slice(0, 2).map((m) => ({
        id: `trend_${m.id}`,
        mediaId: m.id,
        mediaType: m.media_type || 'movie',
        typeLabel: '🔥 Trending',
        title: m.title || m.name || 'Trending Hit',
        desc: `Trending worldwide with ${Math.round((m.vote_average || 7.8) * 10)}% match`,
        poster: this.formatPoster(m.poster_path || m.poster),
        time: 'Yesterday',
        timestamp: Date.now() - 1000 * 60 * 600
      }));

      // Deduplicate notifications so no title appears twice
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
      if (this.isOpen) {
        this.renderDropdownContent();
      }
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

  static toggleDropdown(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (typeof document === 'undefined') return;

    const dropdown = document.getElementById('nf-notifications-dropdown');
    if (!dropdown) return;

    // If currently open, close it
    if (this.isOpen) {
      this.closeDropdown();
      return;
    }

    // Open the dropdown
    this.isOpen = true;
    dropdown.style.setProperty('display', 'flex', 'important');
    dropdown.classList.add('active');

    // Always refresh content when opening
    if (this.notifications.length === 0) {
      this.loadNotifications(true);
    } else {
      this.renderDropdownContent();
    }

    // Close when clicking anywhere outside the bell wrap
    setTimeout(() => {
      // Remove any previous handler first
      if (window._closeNotificationsHandler) {
        window.removeEventListener('click', window._closeNotificationsHandler);
        window._closeNotificationsHandler = null;
      }
      window._closeNotificationsHandler = (evt) => {
        const wrap = document.getElementById('nf-bell-wrap');
        if (wrap && !wrap.contains(evt.target)) {
          NotificationCenter.closeDropdown();
        }
      };
      window.addEventListener('click', window._closeNotificationsHandler, { passive: true });
    }, 50);

    // Close on Escape key
    if (!window._closeNotificationsEscHandler) {
      window._closeNotificationsEscHandler = (evt) => {
        if (evt.key === 'Escape') {
          NotificationCenter.closeDropdown();
        }
      };
      window.addEventListener('keydown', window._closeNotificationsEscHandler, { passive: true });
    }
  }

  static closeDropdown() {
    this.isOpen = false;
    if (typeof document === 'undefined') return;
    const dropdown = document.getElementById('nf-notifications-dropdown');
    if (dropdown) {
      dropdown.style.setProperty('display', 'none', 'important');
      dropdown.classList.remove('active');
    }
    // Clean up outside-click handler
    if (typeof window !== 'undefined' && window._closeNotificationsHandler) {
      window.removeEventListener('click', window._closeNotificationsHandler);
      window._closeNotificationsHandler = null;
    }
  }

  // Auto-refresh notifications every 5 minutes in background
  static startAutoRefresh() {
    if (this._refreshInterval) return;
    this._refreshInterval = setInterval(() => {
      this.loadNotifications(true);
    }, 5 * 60 * 1000);
  }

  static setTab(tab, e) {
    if (e) e.stopPropagation();
    this.activeTab = tab;
    this.renderDropdownContent();
  }

  static markAllAsRead(e) {
    if (e) e.stopPropagation();
    const allIds = this.notifications.map(n => n.id);
    this.saveReadIds(allIds);
    this.updateBadge();
    this.renderDropdownContent();
    if (typeof window !== 'undefined' && window.App) {
      window.App.showToast('All notifications marked as read! ✓');
    }
  }

  static markAsRead(id, e) {
    if (e) e.stopPropagation();
    const readIds = new Set(this.getReadIds());
    readIds.add(id);
    this.saveReadIds(Array.from(readIds));
    this.updateBadge();
    this.renderDropdownContent();
  }

  static openMedia(id, mediaId, mediaType, e) {
    if (e) e.stopPropagation();
    this.markAsRead(id);
    this.closeDropdown();
    if (typeof window !== 'undefined' && window.App) {
      window.App.showDetails(mediaId, mediaType);
    }
  }

  static playMedia(id, mediaId, mediaType, e) {
    if (e) e.stopPropagation();
    this.markAsRead(id);
    this.closeDropdown();
    if (typeof window !== 'undefined' && window.App) {
      window.App.playMedia(mediaId, mediaType);
    }
  }

  static renderDropdownContent() {
    if (typeof document === 'undefined') return;
    const listContainer = document.getElementById('nf-notifications-list');
    const headerCount = document.getElementById('nf-notif-unread-count');
    const tabAll = document.getElementById('nf-notif-tab-all');
    const tabUnread = document.getElementById('nf-notif-tab-unread');
    if (!listContainer) return;

    const readIds = new Set(this.getReadIds());
    const unreadCount = this.getUnreadCount();

    if (headerCount) {
      headerCount.textContent = unreadCount > 0 ? `${unreadCount} new` : '0 new';
    }

    if (tabAll && tabUnread) {
      tabAll.classList.toggle('active', this.activeTab === 'all');
      tabUnread.classList.toggle('active', this.activeTab === 'unread');
    }

    if (this.isLoading && this.notifications.length === 0) {
      listContainer.innerHTML = `
        <div class="nf-notif-loading">
          <div class="nf-notif-spinner"></div>
          <span>Loading new releases...</span>
        </div>
      `;
      return;
    }

    let items = this.notifications;
    if (this.activeTab === 'unread') {
      items = items.filter(n => !readIds.has(n.id));
    }

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div class="nf-notif-empty" style="padding: 28px 16px; text-align: center;">
          <span style="font-size: 1.6rem; margin-bottom: 4px; display:block;">🎉</span>
          <div style="font-weight: 700; color: #fff; font-size: 0.88rem;">You're All Caught Up!</div>
          <p style="color: #888; font-size: 0.75rem; margin-top: 2px; line-height: 1.3;">
            ${this.activeTab === 'unread' ? 'No unread notifications.' : 'No recent updates.'}
          </p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = items.map(item => {
      const isRead = readIds.has(item.id);
      const poster = item.poster || 'https://image.tmdb.org/t/p/w200/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg';
      return `
        <div class="nf-notif-item ${isRead ? 'read' : 'unread'}" style="display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); cursor: pointer;" onclick="NotificationCenter.openMedia('${item.id}', ${item.mediaId}, '${item.mediaType}', event)">
          <div class="nf-notif-poster-wrap" style="width: 44px; min-width: 44px; max-width: 44px; height: 64px; min-height: 64px; max-height: 64px; flex-shrink: 0; position: relative; overflow: hidden; border-radius: 4px; background: #222;">
            <img src="${poster}" alt="${item.title}" loading="lazy" style="width: 44px; min-width: 44px; max-width: 44px; height: 64px; min-height: 64px; max-height: 64px; object-fit: cover; display: block; border-radius: 4px;" onerror="this.src='https://image.tmdb.org/t/p/w200/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'">
            ${!isRead ? '<span class="nf-notif-unread-dot" style="position:absolute; top:3px; left:3px; width:6px; height:6px; background:#E50914; border-radius:50%; box-shadow:0 0 5px #E50914;"></span>' : ''}
          </div>
          <div class="nf-notif-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
            <div class="nf-notif-meta-line" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="nf-notif-type-tag" style="font-size: 0.62rem; font-weight: 800; color: #00f0ff;">${item.typeLabel}</span>
              <span class="nf-notif-time" style="font-size: 0.62rem; color: #888;">${item.time}</span>
            </div>
            <h4 class="nf-notif-title" title="${item.title}" style="font-size: 0.8rem; font-weight: 700; color: #fff; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</h4>
            <p class="nf-notif-desc" style="font-size: 0.7rem; color: #999; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.desc}</p>
            <div class="nf-notif-actions" style="display: flex; gap: 6px; align-items: center; margin-top: 3px;">
              <button class="nf-notif-btn-play" style="background:#E50914; color:#fff; border:none; border-radius:3px; padding:2px 8px; font-size:0.68rem; font-weight:700; cursor:pointer;" onclick="NotificationCenter.playMedia('${item.id}', ${item.mediaId}, '${item.mediaType}', event)">
                ▶ Play
              </button>
              <button class="nf-notif-btn-info" style="background:rgba(255,255,255,0.12); color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:3px; padding:2px 6px; font-size:0.68rem; font-weight:600; cursor:pointer;" onclick="NotificationCenter.openMedia('${item.id}', ${item.mediaId}, '${item.mediaType}', event)">
                ℹ Info
              </button>
              ${!isRead ? `
                <button class="nf-notif-btn-read" style="background:transparent; border:1px solid rgba(255,255,255,0.2); color:#aaa; border-radius:3px; padding:2px 6px; font-size:0.65rem; cursor:pointer; margin-left:auto;" onclick="NotificationCenter.markAsRead('${item.id}', event)" title="Mark as read">
                  ✓
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

if (typeof window !== 'undefined') {
  window.NotificationCenter = NotificationCenter;
}
