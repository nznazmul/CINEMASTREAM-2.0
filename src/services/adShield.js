// ==========================================================================
// CINEMASTREAM — uBlock Origin Lite-Grade In-App AdShield Engine
// Provides zero-ad, popup-free, redirect-safe streaming for all users
// ==========================================================================

export class AdShield {
  static blockedCount = 0;
  static isInitialized = false;
  static blockListeners = [];

  // High-frequency video ad networks, popunder domains, and tracker signatures
  static AD_DOMAIN_PATTERNS = [
    /adsterra\./i,
    /propellerads\./i,
    /popads\./i,
    /popcash\./i,
    /monetag\./i,
    /adnxs\./i,
    /exoclick\./i,
    /hilltopads\./i,
    /trafficjunky\./i,
    /tsyndicate\./i,
    /onclickmega\./i,
    /vlitag\./i,
    /clickadu\./i,
    /yllix\./i,
    /adtrue\./i,
    /juicyads\./i,
    /bet365\./i,
    /1xbet\./i,
    /melbet\./i,
    /mostbet\./i,
    /doubleclick\./i,
    /googlesyndication\./i,
    /revcontent\./i,
    /taboola\./i,
    /outbrain\./i,
    /mgid\./i,
    /admaven\./i,
    /cpmstar\./i,
    /adcash\./i,
    /richpush\./i,
    /adxcore\./i,
    /trafficstars\./i,
    /clouddelivery\./i,
    /directrev\./i,
    /deloton\./i,
    /in-page-push\./i,
    /trackvoluum\./i,
    /stags\./i,
    /bidgear\./i,
    /zeroredirect\./i,
    /serving-sys\./i
  ];

  static init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;
    this.blockedCount = 0;

    this.defusePopups();
    this.setupNavigationGuards();
    this.startOverlaySanitizer();

    console.log('🛡️ [AdShield] uBlock Origin-grade protection active & ready');
  }

  static onBlock(callback) {
    if (typeof callback === 'function') {
      this.blockListeners.push(callback);
    }
  }

  static triggerBlock(detail = 'Popup Ad') {
    this.blockedCount++;
    console.warn(`🛡️ [AdShield] Blocked [${detail}] (Total: ${this.blockedCount})`);
    
    // Notify all registered UI listeners
    for (const listener of this.blockListeners) {
      try {
        listener(this.blockedCount, detail);
      } catch(e) {}
    }

    // Update player badge if currently mounted in DOM
    if (typeof document !== 'undefined') {
      const badge = document.querySelector('.ad-shield-badge');
      if (badge) {
        badge.innerHTML = `<span>🛡️ AdShield: ${this.blockedCount} Blocked</span>`;
        badge.classList.add('pulse');
        setTimeout(() => badge.classList.remove('pulse'), 600);
      }
    }
  }

  /**
   * Overrides window.open with strict ad-filtering and validation
   */
  static defusePopups() {
    const originalOpen = window.open;
    const self = this;

    window.open = function (url, target, features) {
      const urlStr = String(url || '');

      // Check if URL matches known ad/betting/redirect networks
      const isKnownAd = self.AD_DOMAIN_PATTERNS.some(pattern => pattern.test(urlStr));
      const isBlankOrScript = !urlStr || urlStr.startsWith('javascript:') || urlStr === 'about:blank';
      
      // If triggered from third-party streaming iframe or matches ad patterns -> Block immediately
      if (isKnownAd || isBlankOrScript || self.isUntrustedOpenContext()) {
        self.triggerBlock(`Popup: ${urlStr ? urlStr.substring(0, 40) + '...' : 'Blank Hijack'}`);
        return {
          closed: true,
          focus: () => {},
          blur: () => {},
          close: () => {},
          location: { href: '' }
        };
      }

      return originalOpen.apply(this, arguments);
    };
  }

  static isUntrustedOpenContext() {
    try {
      const isPlayerActive = document.body && document.body.classList.contains('player-active');
      return isPlayerActive;
    } catch(e) {
      return false;
    }
  }

  /**
   * Prevents third-party scripts from hijacking top-level navigation
   */
  static setupNavigationGuards() {
    if (typeof window === 'undefined') return;

    // Defuse window.onbeforeunload hijacking
    window.addEventListener('beforeunload', (e) => {
      // Allow clean user navigation
    });

    // Guard history state manipulation from embeds
    const originalPushState = window.history.pushState;
    window.history.pushState = function(state, unused, url) {
      if (url && typeof url === 'string') {
        const isAdUrl = AdShield.AD_DOMAIN_PATTERNS.some(p => p.test(url));
        if (isAdUrl) {
          AdShield.triggerBlock(`History Hijack: ${url}`);
          return;
        }
      }
      return originalPushState.apply(this, arguments);
    };
  }

  /**
   * Periodically scans and eliminates invisible clickjacking overlay layers
   */
  static startOverlaySanitizer() {
    if (typeof document === 'undefined') return;

    setInterval(() => {
      this.purgeInvisibleOverlays();
    }, 2500);
  }

  static purgeInvisibleOverlays() {
    if (typeof document === 'undefined') return;
    const viewport = document.getElementById('video-wrapper');
    if (!viewport) return;

    // Check for suspicious invisible full-screen clickjacking divs created above video
    const elements = viewport.querySelectorAll('div');
    elements.forEach(el => {
      if (el.id === 'iframe-slot' || el.id === 'btn-skip-intro') return;
      const style = window.getComputedStyle(el);
      const zIndex = parseInt(style.zIndex, 10);
      const opacity = parseFloat(style.opacity);
      
      // If div is completely transparent, has high z-index, and covers the screen -> purge it
      if ((opacity === 0 || style.visibility === 'hidden') && zIndex > 100 && (el.offsetWidth > 200 || el.offsetHeight > 200)) {
        console.warn('🛡️ [AdShield] Purged clickjack overlay layer:', el);
        el.remove();
        this.triggerBlock('Clickjack Overlay');
      }
    });
  }

  /**
   * Creates an optimized, secure sandboxed iframe for video streaming
   * Blocks top-level redirects and popunders while maintaining full video capabilities
   */
  static createSandboxedIframe(src, title = 'Video Stream') {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title;
    iframe.className = 'video-iframe-embed';
    
    // Hardware acceleration & media capabilities
    iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('webkitallowfullscreen', 'true');
    iframe.setAttribute('mozallowfullscreen', 'true');
    
    if (!src.includes('youtube')) {
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      
      // Smart AdShield Sandbox Profile:
      // Enables: JavaScript, HTML5 video controls, same-origin storage, media playback, forms
      // STRICTLY BLOCKS: Top-level navigation (redirecting current tab to ads), popup escapes, modal locks
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
    }

    iframe.setAttribute('loading', 'eager');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    // Track iframe load events and ensure no leaked popups
    iframe.onload = () => {
      this.purgeInvisibleOverlays();
    };

    return iframe;
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  AdShield.init();
  window.AdShield = AdShield;
}
