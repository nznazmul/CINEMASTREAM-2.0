/**
 * CinemaStream Netflix-Style VIP Authentication & Profile Modal
 * Supports Google Identity Services (GIS) Sign-In, One-Tap, and Account Management
 */

import { AuthService } from '../services/auth.js';

export class AuthModal {
  static open() {
    let modal = document.getElementById('nf-auth-modal-overlay');
    if (modal) modal.remove();

    const user = AuthService.getUser();
    const isLoggedIn = AuthService.isLoggedIn();

    modal = document.createElement('div');
    modal.id = 'nf-auth-modal-overlay';
    modal.className = 'nf-auth-modal-overlay';
    modal.onclick = (e) => {
      if (e.target === modal) this.close();
    };

    const bookmarksKey = user ? `cs_bookmarks_${user.id}` : 'cs_bookmarks';
    const historyKey = user ? `cs_history_${user.id}` : 'cs_history';
    const bookmarkCount = JSON.parse(localStorage.getItem(bookmarksKey) || localStorage.getItem('cs_bookmarks') || '[]').length;
    const historyCount = JSON.parse(localStorage.getItem(historyKey) || localStorage.getItem('cs_history') || '[]').length;

    modal.innerHTML = `
      <div class="nf-auth-modal-card" onclick="event.stopPropagation()">
        <button class="nf-auth-close-btn" onclick="window.AuthModal.close()" title="Close">✕</button>

        ${isLoggedIn ? `
          <!-- Logged In User Profile View -->
          <div class="nf-auth-profile-view">
            <div class="nf-profile-header">
              <div class="nf-profile-avatar-wrap">
                <img src="${user.picture}" alt="${user.name}" class="nf-profile-avatar-large" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=E50914&color=fff'">
                <span class="nf-vip-crown" title="VIP Status">👑</span>
              </div>
              <div class="nf-profile-meta">
                <div class="nf-profile-name-row">
                  <h2 class="nf-profile-name">${user.name}</h2>
                  <span class="nf-google-verified-badge" title="Verified with Google">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#4285F4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    Google
                  </span>
                </div>
                <div class="nf-profile-email">${user.email}</div>
                <div class="nf-profile-tier-badge">👑 VIP 4K Ultra HD • Lifetime Active</div>
              </div>
            </div>

            <div class="nf-profile-stats-grid">
              <div class="nf-stat-box" onclick="window.AuthModal.close(); window.Router.navigate('mylist')">
                <div class="nf-stat-num">${bookmarkCount}</div>
                <div class="nf-stat-label">Saved in Watchlist</div>
              </div>
              <div class="nf-stat-box" onclick="window.AuthModal.close(); window.Router.navigate('home')">
                <div class="nf-stat-num">${historyCount}</div>
                <div class="nf-stat-label">Watched Titles</div>
              </div>
            </div>

            <div class="nf-profile-perks">
              <div class="nf-perk-item">✓ Zero Commercial Ads & Popups (AdShield Active)</div>
              <div class="nf-perk-item">✓ 4K Ultra HD & 60FPS Video Mirrors Enabled</div>
              <div class="nf-perk-item">✓ Multi-Language Audio Dubs (Hindi, Tamil, Telugu, English)</div>
              <div class="nf-perk-item">✓ Real-Time Release Radar & Notification Alerts</div>
            </div>

            <div class="nf-profile-actions">
              <button class="nf-btn-primary" onclick="window.AuthModal.close(); window.Router.navigate('mylist')">
                📑 Open My Watchlist
              </button>
              <button class="nf-btn-secondary" onclick="window.AuthService.logout()">
                🚪 Sign Out
              </button>
            </div>
          </div>
        ` : `
          <!-- Logged Out / Google Sign-In View -->
          <div class="nf-auth-signin-view">
            <div class="nf-auth-brand-badge">CINEMASTREAM VIP</div>
            <h2 class="nf-auth-title">Sign in with Google</h2>
            <p class="nf-auth-subtitle">
              Sync your watchlist across devices, resume videos right where you left off, and unlock 4K Ultra HD streaming.
            </p>

            <div id="nf-google-btn-slot" class="nf-google-btn-slot"></div>

            <div class="nf-auth-divider">
              <span>OR</span>
            </div>

            <button type="button" class="nf-btn-instant-vip" onclick="window.AuthService.demoGoogleLogin()">
              <span>🚀 Continue as Instant VIP Member</span>
            </button>

            <div class="nf-auth-benefits-card">
              <div class="nf-benefit-title">💎 VIP Member Privileges</div>
              <ul class="nf-benefit-list">
                <li><span class="check">✓</span> <strong>Ad-Free Streaming:</strong> Built-in uBlock Origin scriptlet defusers</li>
                <li><span class="check">✓</span> <strong>Cloud Watchlist:</strong> Access your saved movies anywhere</li>
                <li><span class="check">✓</span> <strong>4K HDR Quality:</strong> 12 Ultra-fast CDN streaming servers</li>
                <li><span class="check">✓</span> <strong>Multi-Audio Dubs:</strong> English, Hindi, Tamil, Telugu & more</li>
              </ul>
            </div>
          </div>
        `}
      </div>
    `;

    document.body.appendChild(modal);

    // If logged out, render Google Sign-In button into the slot
    if (!isLoggedIn) {
      const slot = document.getElementById('nf-google-btn-slot');
      if (slot) {
        AuthService.renderGoogleButton(slot);
      }
    }
  }

  static close() {
    const modal = document.getElementById('nf-auth-modal-overlay');
    if (modal) modal.remove();
  }
}

if (typeof window !== 'undefined') {
  window.AuthModal = AuthModal;
}
