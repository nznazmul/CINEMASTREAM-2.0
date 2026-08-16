import { ApiService } from '../services/api.js';

export class NotificationCenter {
  static isOpen = false;
  static notifications = [];
  static activeTab = 'all'; // 'all' | 'unread'
  static storageKey = 'cs_read_notifications';

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

  static async loadNotifications() {
    try {
      const [nowPlaying, onAir, trending] = await Promise.all([
        ApiService.getMovies('now_playing', null, 1).catch(() => ({ results: [] })),
        ApiService.getTVSeries('on_the_air', null, 1).catch(() => ({ results: [] })),
        ApiService.getTrending(1).catch(() => ({ results: [] }))
      ]);

      const npItems = (nowPlaying.results || []).slice(0, 3).map(m => ({
        id: `np_${m.id}`,
        mediaId: m.id,
        mediaType: 'movie',
        typeLabel: '🎬 New Movie 4K',
        title: m.title || m.name,
        desc: `Now streaming in 4K Ultra HD & Dolby Atmos 5.1 audio.`,
        poster: m.poster_path,
        time: 'Just now',
        timestamp: Date.now() - 1000 * 60 * 15
      }));

      const tvItems = (onAir.results || []).slice(0, 3).map(m => ({
        id: `tv_${m.id}`,
        mediaId: m.id,
        mediaType: 'tv',
        typeLabel: '📺 New Episode',
        title: m.name || m.title,
        desc: `New season episode now available across 12 high-speed servers.`,
        poster: m.poster_path,
        time: '2 hours ago',
        timestamp: Date.now() - 1000 * 60 * 120
      }));

      const trendItems = (trending.results || []).slice(0, 2).map(m => ({
        id: `trend_${m.id}`,
        mediaId: m.id,
        mediaType: m.media_type || 'movie',
        typeLabel: '🔥 Trending #1',
        title: m.title || m.name,
        desc: `Trending worldwide today with ${Math.round((m.vote_average || 7.5) * 10)}% match.`,
        poster: m.poster_path,
        time: 'Today',
        timestamp: Date.now() - 1000 * 60 * 360
      }));

      this.notifications = [...npItems, ...tvItems, ...trendItems];
      this.updateBadge();
      this.renderDropdownContent();
    } catch (e) {
      console.warn('Could not load notifications:', e);
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
    if (e) e.stopPropagation();
    if (typeof document === 'undefined') return;
    this.isOpen = !this.isOpen;
    const dropdown = document.getElementById('nf-notifications-dropdown');
    if (!dropdown) return;

    if (this.isOpen) {
      dropdown.classList.add('active');
      this.renderDropdownContent();
      // Setup outside click dismissal
      setTimeout(() => {
        window.removeEventListener('click', window._closeNotificationsHandler);
        window._closeNotificationsHandler = (evt) => {
          const wrap = document.getElementById('nf-bell-wrap');
          if (wrap && !wrap.contains(evt.target)) {
            NotificationCenter.closeDropdown();
          }
        };
        window.addEventListener('click', window._closeNotificationsHandler);
      }, 50);
    } else {
      dropdown.classList.remove('active');
    }
  }

  static closeDropdown() {
    this.isOpen = false;
    if (typeof document === 'undefined') return;
    const dropdown = document.getElementById('nf-notifications-dropdown');
    if (dropdown) dropdown.classList.remove('active');
    if (typeof window !== 'undefined' && window._closeNotificationsHandler) {
      window.removeEventListener('click', window._closeNotificationsHandler);
    }
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
      headerCount.textContent = unreadCount > 0 ? `${unreadCount} unread` : '0 unread';
    }

    if (tabAll && tabUnread) {
      tabAll.classList.toggle('active', this.activeTab === 'all');
      tabUnread.classList.toggle('active', this.activeTab === 'unread');
    }

    let items = this.notifications;
    if (this.activeTab === 'unread') {
      items = items.filter(n => !readIds.has(n.id));
    }

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div class="nf-notif-empty">
          <span style="font-size: 2rem; margin-bottom: 8px;">🎉</span>
          <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">All Caught Up!</div>
          <p style="color: #888; font-size: 0.8rem; margin-top: 4px;">No unread notifications at the moment.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = items.map(item => {
      const isRead = readIds.has(item.id);
      const poster = item.poster || 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg';
      return `
        <div class="nf-notif-item ${isRead ? 'read' : 'unread'}" onclick="NotificationCenter.openMedia('${item.id}', ${item.mediaId}, '${item.mediaType}', event)">
          <div class="nf-notif-poster-wrap">
            <img src="${poster}" alt="${item.title}" loading="lazy" onerror="this.src='https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'">
            ${!isRead ? '<span class="nf-notif-unread-dot"></span>' : ''}
          </div>
          <div class="nf-notif-info">
            <div class="nf-notif-meta-line">
              <span class="nf-notif-type-tag">${item.typeLabel}</span>
              <span class="nf-notif-time">${item.time}</span>
            </div>
            <h4 class="nf-notif-title">${item.title}</h4>
            <p class="nf-notif-desc">${item.desc}</p>
            <div class="nf-notif-actions">
              <button class="nf-notif-btn-play" onclick="NotificationCenter.playMedia('${item.id}', ${item.mediaId}, '${item.mediaType}', event)">
                ▶ Play 4K
              </button>
              ${!isRead ? `
                <button class="nf-notif-btn-read" onclick="NotificationCenter.markAsRead('${item.id}', event)" title="Mark as read">
                  ✓ Mark read
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
