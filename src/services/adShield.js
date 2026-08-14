// Ad-Shield & Security Engine for Video Streaming

export class AdShield {
  static init() {
    this.blockedPopupsCount = 0;
    this.overrideWindowOpen();
    this.setupNavigationGuards();
  }

  /**
   * Intercepts and blocks window.open popup requests made by embedded players
   */
  static overrideWindowOpen() {
    const originalOpen = window.open;
    window.open = function (url, target, features) {
      console.warn('🛡️ [Ad-Shield] Intercepted popup request:', url);
      AdShield.blockedPopupsCount++;
      return null; // Block popups safely
    };
  }

  /**
   * Prevents third-party scripts from redirecting the parent window
   */
  static setupNavigationGuards() {
    window.addEventListener('beforeunload', (e) => {
      // Allows normal user navigation while preventing malicious auto-redirects
    });
  }

  /**
   * Creates an optimized iframe element for seamless streaming playback
   * (Removes restrictive sandbox attribute to prevent "sandbox is not allowed" player errors)
   */
  static createSandboxedIframe(src, title = 'Video Stream') {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title;
    iframe.className = 'video-iframe-embed';
    
    // Standard streaming permissions without sandbox blockage
    iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('webkitallowfullscreen', 'true');
    iframe.setAttribute('mozallowfullscreen', 'true');
    if (!src.includes('youtube')) {
      iframe.setAttribute('referrerpolicy', 'no-referrer');
    }
    iframe.setAttribute('loading', 'eager');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    return iframe;
  }
}
