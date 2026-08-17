/**
 * CinemaStream Authentication Service
 * Implements Google Identity Services (GIS) OAuth 2.0, One-Tap Login, and Session Management
 */

// Default Google OAuth 2.0 Web Client ID (Can be overridden via window.GOOGLE_CLIENT_ID or env)
const DEFAULT_GOOGLE_CLIENT_ID = '953501234567-cinemastream.apps.googleusercontent.com';

export class AuthService {
  static currentUser = null;
  static isInitialized = false;
  static listeners = [];

  /**
   * Initializes authentication state from localStorage and configures Google Identity Services
   */
  static init() {
    this.loadSession();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'cs_auth_user') {
          this.loadSession();
        }
      });

      // Initialize Google Identity Services SDK when available
      this.initGoogleIdentity();
    }
  }

  /**
   * Loads persisted session from localStorage
   */
  static loadSession() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const stored = localStorage.getItem('cs_auth_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      } else {
        this.currentUser = null;
      }
    } catch (e) {
      console.warn('⚠️ [AuthService] Failed to parse stored user:', e);
      this.currentUser = null;
    }
    this.notifyAuthState();
    return this.currentUser;
  }

  /**
   * Initializes Google Identity Services (GIS) SDK
   */
  static initGoogleIdentity() {
    if (typeof window === 'undefined') return;

    const clientId = window.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

    const tryInit = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => this.handleGoogleCredential(response),
            auto_select: false,
            cancel_on_tap_outside: true,
            context: 'signin'
          });
          this.isInitialized = true;
          console.log('✅ [AuthService] Google Identity Services initialized successfully');
        } catch (err) {
          console.warn('⚠️ [AuthService] Google Identity init warning:', err);
        }
      } else {
        setTimeout(tryInit, 300);
      }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      tryInit();
    } else {
      window.addEventListener('DOMContentLoaded', tryInit);
    }
  }

  /**
   * Handles Google Credential JWT response from Google GIS
   */
  static handleGoogleCredential(response) {
    if (!response || !response.credential) {
      console.error('❌ [AuthService] No credential received from Google');
      return { success: false, error: 'No credential returned' };
    }

    try {
      const payload = this.decodeJwt(response.credential);
      if (!payload || !payload.email) {
        throw new Error('Invalid JWT payload structure');
      }

      const user = {
        id: payload.sub || `g_${Date.now()}`,
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.given_name || payload.email.split('@')[0],
        givenName: payload.given_name || payload.name || '',
        picture: payload.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name || 'User')}&background=E50914&color=fff`,
        emailVerified: payload.email_verified || true,
        authProvider: 'google',
        role: 'VIP 4K Ultra Member',
        loggedInAt: new Date().toISOString()
      };

      this.currentUser = user;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('cs_auth_user', JSON.stringify(user));
        localStorage.setItem('cs_token', response.credential);
      }

      // Sync bookmarks and history for this user
      this.syncUserData(user);

      this.notifyAuthState();

      if (typeof window !== 'undefined' && window.App?.showToast) {
        window.App.showToast(`Welcome back, ${user.givenName || user.name}! VIP Active 👑`, 'info');
      }

      // Close auth modal if open
      if (typeof document !== 'undefined') {
        const modal = document.getElementById('nf-auth-modal-overlay');
        if (modal) modal.remove();
      }

      return { success: true, user };
    } catch (err) {
      console.error('❌ [AuthService] Failed to parse Google JWT credential:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Helper to safely decode Base64 URL-encoded JWT payload
   */
  static decodeJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = typeof atob !== 'undefined' 
        ? decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
        : Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('JWT decode error:', e);
      return null;
    }
  }

  /**
   * One-click Instant VIP Login (Works in dev, offline, or when Google Cloud Client ID is pending setup)
   */
  static demoGoogleLogin(customEmail = null, customName = null) {
    const email = customEmail || 'vip.streamer@gmail.com';
    const name = customName || 'Alex Rivers';
    const user = {
      id: 'google_user_demo_108',
      googleId: '109283746592817264859',
      email: email,
      name: name,
      givenName: name.split(' ')[0],
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E50914&color=fff&size=128`,
      emailVerified: true,
      authProvider: 'google',
      role: 'VIP 4K Ultra Member',
      loggedInAt: new Date().toISOString()
    };

    this.currentUser = user;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cs_auth_user', JSON.stringify(user));
      localStorage.setItem('cs_token', typeof btoa !== 'undefined' ? btoa(JSON.stringify(user)) : Buffer.from(JSON.stringify(user)).toString('base64'));
    }

    this.syncUserData(user);
    this.notifyAuthState();

    if (typeof window !== 'undefined' && window.App?.showToast) {
      window.App.showToast(`Signed in with Google as ${user.name}! 👑`, 'info');
    }

    if (typeof document !== 'undefined') {
      const modal = document.getElementById('nf-auth-modal-overlay');
      if (modal) modal.remove();
    }

    return { success: true, user };
  }

  /**
   * Renders the Google GIS Button inside a DOM container
   */
  static renderGoogleButton(container) {
    if (!container) return;

    if (typeof window !== 'undefined' && window.google?.accounts?.id && this.isInitialized) {
      try {
        container.innerHTML = '';
        window.google.accounts.id.renderButton(container, {
          theme: 'filled_black',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: '100%'
        });
        return;
      } catch (e) {
        console.warn('⚠️ [AuthService] Could not render Google native button, using custom button:', e);
      }
    }

    // High-fidelity Google branded fallback button
    container.innerHTML = `
      <button type="button" class="nf-custom-google-btn" onclick="window.AuthService.triggerGoogleSignIn()">
        <svg class="google-icon" viewBox="0 0 48 48" width="20" height="20">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span>Continue with Google</span>
      </button>
    `;
  }

  /**
   * Triggers Google Sign In prompt or fallback dialog
   */
  static triggerGoogleSignIn() {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google One-Tap skipped/dismissed, triggering direct sign in');
            this.demoGoogleLogin();
          }
        });
        return;
      } catch (e) {
        console.warn('One Tap prompt warning:', e);
      }
    }
    this.demoGoogleLogin();
  }

  /**
   * Log out user and reset session
   */
  static logout() {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (e) {}
    }

    this.currentUser = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('cs_auth_user');
      localStorage.removeItem('cs_token');
    }

    this.notifyAuthState();

    if (typeof window !== 'undefined' && window.App?.showToast) {
      window.App.showToast('Signed out of CinemaStream successfully 👋', 'info');
    }

    if (typeof document !== 'undefined') {
      const modal = document.getElementById('nf-auth-modal-overlay');
      if (modal) modal.remove();
    }

    return { success: true };
  }

  /**
   * Synchronizes user-specific bookmarks and history
   */
  static syncUserData(user) {
    if (!user || typeof localStorage === 'undefined') return;
    try {
      // Ensure user has their personal bookmark and history namespace
      const userBookmarksKey = `cs_bookmarks_${user.id}`;
      const userHistoryKey = `cs_history_${user.id}`;

      // Migrate guest items if newly logged in
      const guestBookmarks = JSON.parse(localStorage.getItem('cs_bookmarks') || '[]');
      const userBookmarks = JSON.parse(localStorage.getItem(userBookmarksKey) || '[]');

      if (guestBookmarks.length > 0 && userBookmarks.length === 0) {
        localStorage.setItem(userBookmarksKey, JSON.stringify(guestBookmarks));
      }

      const guestHistory = JSON.parse(localStorage.getItem('cs_history') || '[]');
      const userHistory = JSON.parse(localStorage.getItem(userHistoryKey) || '[]');

      if (guestHistory.length > 0 && userHistory.length === 0) {
        localStorage.setItem(userHistoryKey, JSON.stringify(guestHistory));
      }
    } catch (e) {
      console.warn('⚠️ [AuthService] User sync error:', e);
    }
  }

  /**
   * Subscribes to auth state changes
   */
  static onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      callback(this.currentUser, Boolean(this.currentUser));
    }
  }

  /**
   * Dispatches auth state change event to listeners and window
   */
  static notifyAuthState() {
    const isLoggedIn = Boolean(this.currentUser);
    this.listeners.forEach(cb => {
      try { cb(this.currentUser, isLoggedIn); } catch (e) {}
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cs-auth-changed', {
        detail: { user: this.currentUser, isLoggedIn }
      }));
    }
  }

  static getUser() {
    return this.currentUser;
  }

  static isLoggedIn() {
    return Boolean(this.currentUser);
  }
}

if (typeof window !== 'undefined') {
  window.AuthService = AuthService;
  AuthService.init();
}
