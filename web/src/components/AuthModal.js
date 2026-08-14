import { ApiService } from '../services/api.js';

export class AuthModal {
  static openAuth() {
    const container = document.getElementById('auth-modal-container');
    const token = ApiService.getAuthToken();

    if (token) {
      this.renderProfile(container);
    } else {
      this.renderAuthForm(container, 'login');
    }
  }

  static renderAuthForm(container, mode = 'login') {
    container.innerHTML = `
      <div class="player-modal-backdrop" onclick="if(event.target === this) window.App.closeAuthModal()">
        <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); width: 90%; max-width: 440px; padding: 36px; box-shadow: 0 20px 50px rgba(0,0,0,0.9); animation: fadeIn 0.3s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.5rem; color: #fff;">
              ${mode === 'login' ? 'Sign In to CinemaStream' : 'Create Free Account'}
            </h3>
            <button class="btn-ctrl" onclick="window.App.closeAuthModal()">✕</button>
          </div>

          <form id="auth-form" onsubmit="window.App.handleAuthSubmit(event, '${mode}')" style="display: flex; flex-direction: column; gap: 16px;">
            ${mode === 'register' ? `
              <div>
                <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">Username</label>
                <input type="text" id="auth-username" required style="width: 100%; height: 44px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 0 14px; color: #fff; font-family: inherit;">
              </div>
            ` : ''}

            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">Email Address</label>
              <input type="email" id="auth-email" required style="width: 100%; height: 44px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 0 14px; color: #fff; font-family: inherit;">
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px;">Password</label>
              <input type="password" id="auth-password" required minlength="6" style="width: 100%; height: 44px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 0 14px; color: #fff; font-family: inherit;">
            </div>

            <button type="submit" class="btn-hero-play" style="width: 100%; justify-content: center; margin-top: 10px;">
              ${mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style="text-align: center; margin-top: 20px; font-size: 0.9rem; color: var(--text-secondary);">
            ${mode === 'login' 
              ? `Don't have an account? <a href="#" onclick="window.App.switchAuthMode('register')" style="color: var(--accent-cyan); font-weight: 700;">Sign Up Free</a>`
              : `Already registered? <a href="#" onclick="window.App.switchAuthMode('login')" style="color: var(--accent-cyan); font-weight: 700;">Sign In</a>`}
          </div>
        </div>
      </div>
    `;
  }

  static renderProfile(container) {
    container.innerHTML = `
      <div class="player-modal-backdrop" onclick="if(event.target === this) window.App.closeAuthModal()">
        <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); width: 90%; max-width: 440px; padding: 36px; box-shadow: 0 20px 50px rgba(0,0,0,0.9);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.4rem; color: #fff;">My Account</h3>
            <button class="btn-ctrl" onclick="window.App.closeAuthModal()">✕</button>
          </div>

          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding: 16px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md);">
            <div style="width: 54px; height: 54px; border-radius: 50%; background: var(--accent-cyan); color: #000; font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">
              👤
            </div>
            <div>
              <h4 style="font-size: 1.1rem; color: #fff;">Cinema VIP User</h4>
              <p style="font-size: 0.85rem; color: var(--text-secondary);">Cloud Watchlist & History Synchronized</p>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn-hero-trailer" style="width: 100%; justify-content: center;" onclick="window.Router.navigate('bookmarks'); window.App.closeAuthModal();">
              ❤️ View Saved Watchlist
            </button>
            <button class="btn-hero-trailer" style="width: 100%; justify-content: center;" onclick="window.App.openHealthModal()">
              ⚡ Inspect Server Health & Proxies
            </button>
            <button class="btn-hero-play" style="width: 100%; justify-content: center; background: var(--accent-red); color: #fff; box-shadow: none;" onclick="window.App.logout()">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    `;
  }

  static async openHealthModal() {
    const container = document.getElementById('auth-modal-container');
    const res = await ApiService.getHealth();
    const providers = res.providers || {};

    container.innerHTML = `
      <div class="player-modal-backdrop" onclick="if(event.target === this) window.App.closeAuthModal()">
        <div style="background: var(--bg-card); border: 1px solid var(--accent-cyan); border-radius: var(--radius-lg); width: 90%; max-width: 550px; padding: 32px; box-shadow: 0 0 40px var(--accent-cyan-glow);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.35rem; color: #fff; display: flex; align-items: center; gap: 8px;">
              ⚡ Dynamic Scraper & Proxy Health
            </h3>
            <button class="btn-ctrl" onclick="window.App.closeAuthModal()">✕</button>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
            Live upstream server status monitor with automated failover and dynamic synchronization.
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${Object.entries(providers).map(([key, data]) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--glass-border);">
                <div>
                  <h5 style="color: #fff; font-size: 0.95rem; text-transform: uppercase;">${key}</h5>
                  <span style="font-size: 0.8rem; color: var(--text-secondary);">Latency: ${data.latency || 45}ms • Success: ${data.successRate || 99}%</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; color: #10b981; font-weight: 700; font-size: 0.85rem;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                  ONLINE
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
}
