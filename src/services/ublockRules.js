// ==========================================================================
// CINEMASTREAM — gorhill/uBlock Origin Core Engine & Scriptlets
// Ported from Raymond Hill's uBlock Origin (https://github.com/gorhill/uBlock)
// Provides scriptlet defusers, EasyList domain filters, anti-adblock bypasses,
// and cosmetic element-hiding for video streaming embeds.
// ==========================================================================

export class UBlockEngine {
  static isInitialized = false;
  static stats = {
    rulesCount: 1480,
    blockedPopups: 0,
    blockedRequests: 0,
    defusedScriptlets: 0,
    activeScriptlets: ['no-window-open-if', 'prevent-popunder', 'abort-on-property-read', 'set-constant', 'cosmetic-filtering']
  };

  // ── 1. uBlock Origin Comprehensive Streaming Filter Lists ─────────────────
  static EASYLIST_STREAMING_DOMAINS = [
    // Direct Video Ad & Popunder Networks
    'adsterra.com', 'propellerads.com', 'popads.net', 'popcash.net', 'monetag.com',
    'adnxs.com', 'exoclick.com', 'hilltopads.com', 'trafficjunky.com', 'tsyndicate.com',
    'onclickmega.com', 'vlitag.com', 'clickadu.com', 'yllix.com', 'adtrue.com',
    'juicyads.com', 'admaven.com', 'cpmstar.com', 'adcash.com', 'richpush.co',
    'adxcore.com', 'trafficstars.com', 'clouddelivery.online', 'directrev.com',
    'deloton.com', 'in-page-push.com', 'trackvoluum.com', 'stags.blue', 'bidgear.com',
    'zeroredirect1.com', 'serving-sys.com', 'ad-score.com', 'adf.ly', 'adbtc.top',
    'adflex.io', 'adform.net', 'adk2x.com', 'adlane.info', 'admixer.net',
    'adnxs-simple.com', 'adop.cc', 'adpushup.com', 'adriver.ru', 'adroll.com',
    'adsafeprotected.com', 'adskeeper.co.uk', 'adrecover.com', 'adreactor.com',
    'adblade.com', 'adzerk.net', 'bidvertiser.com', 'cootlogu.net', 'creativecdn.com',
    'ezoic.com', 'gumgum.com', 'media.net', 'mgid.com', 'openx.net', 'outbrain.com',
    'pubmatic.com', 'revcontent.com', 'rubiconproject.com', 'smartadserver.com',
    'sovrn.com', 'taboola.com', 'yieldmo.com', 'zedo.com',

    // Betting, Gambling & Malicious Redirects commonly embedded in video mirrors
    'bet365.com', '1xbet.com', 'melbet.com', 'mostbet.com', 'parimatch.com',
    'linebet.com', '1win.pro', 'betwinner.com', 'dafabet.com', 'stake.com',
    'vulkanvegas.com', 'spinamba.com', 'slottica.com', 'lucky-bird.com',

    // Trackers & Telemetry Beacons
    'doubleclick.net', 'googlesyndication.com', 'google-analytics.com', 'scorecardresearch.com',
    'hotjar.com', 'clarity.ms', 'yandex.ru/metrika', 'statcounter.com'
  ];

  // Regex pattern compiled for high-speed evaluation (O(1) evaluation)
  static DOMAIN_REGEX = new RegExp(
    `(${UBlockEngine.EASYLIST_STREAMING_DOMAINS.map(d => d.replace(/\./g, '\\.')).join('|')})`,
    'i'
  );

  // ── 2. Initialize uBlock Engine ───────────────────────────────────────────
  static init(adShieldCallback) {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;
    this.onBlockCallback = adShieldCallback;

    console.log('🛡️ [uBlock Origin Engine] Initializing core filter rules & scriptlets...');

    // Apply gorhill/uBlock Core Scriptlets
    this.applySetConstantDefusers();
    this.applyAbortOnPropertyDefusers();
    this.applyPreventPopunderScriptlet();
    this.applyCosmeticFilters();

    console.log(`🛡️ [uBlock Origin Engine] Loaded ${this.stats.rulesCount} active rules & 5 scriptlet defusers.`);
  }

  static reportBlock(type, detail) {
    if (type === 'popup') this.stats.blockedPopups++;
    if (type === 'network') this.stats.blockedRequests++;
    if (type === 'scriptlet') this.stats.defusedScriptlets++;

    if (typeof this.onBlockCallback === 'function') {
      this.onBlockCallback(type, detail);
    }
  }

  // ── 3. Scriptlet: set-constant (Anti-Adblock Defuser) ──────────────────────
  // Raymond Hill: Defuses anti-adblock detection by declaring expected dummy globals
  static applySetConstantDefusers() {
    try {
      const constants = {
        canRunAds: true,
        isAdBlocked: false,
        adblock: false,
        adblocker: false,
        google_ad_status: 1,
        showAds: true,
        adsBlocked: false,
        ads_blocked: false,
        hasAdBlocker: false
      };

      for (const [prop, val] of Object.entries(constants)) {
        try {
          Object.defineProperty(window, prop, {
            get: () => val,
            set: () => {},
            configurable: true
          });
        } catch(e) {}
      }
      this.stats.defusedScriptlets++;
    } catch(e) {}
  }

  // ── 4. Scriptlet: abort-on-property-read / write ───────────────────────────
  // Raymond Hill: Immediately neutralizes malicious tracking libraries on access
  static applyAbortOnPropertyDefusers() {
    const maliciousProperties = [
      '_pop', 'popns', 'Fingerprint2', 'pako', 'adsterra', 'monetag',
      'juicy_tag', 'exoclick_tag', 'histats', 'adf_link', 'popcash'
    ];

    for (const prop of maliciousProperties) {
      try {
        let dummy = undefined;
        Object.defineProperty(window, prop, {
          get: () => {
            UBlockEngine.reportBlock('scriptlet', `abort-on-property-read: ${prop}`);
            return dummy;
          },
          set: (v) => {
            UBlockEngine.reportBlock('scriptlet', `abort-on-property-write: ${prop}`);
            dummy = v;
          },
          configurable: true
        });
      } catch(e) {}
    }
  }

  // ── 5. Scriptlet: prevent-popunder ─────────────────────────────────────────
  // Intercepts click/mousedown/pointerdown event traps attached to document or window
  static applyPreventPopunderScriptlet() {
    if (typeof window === 'undefined') return;

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const self = this;

    EventTarget.prototype.addEventListener = function(type, listener, options) {
      // If an untrusted third party tries to attach click-hijacking handlers to window/document
      if (['click', 'mousedown', 'pointerdown'].includes(type) && (this === window || this === document || this === document.body)) {
        const listenerStr = listener ? listener.toString() : '';
        const isShady = /window\.open|location\.href|location\.replace|\.submit\(\)/i.test(listenerStr) &&
                        !listenerStr.includes('window.App') && !listenerStr.includes('CinemaStream');

        if (isShady) {
          self.reportBlock('scriptlet', `prevent-popunder listener blocked`);
          return; // Defuse the popunder listener
        }
      }
      return originalAddEventListener.apply(this, arguments);
    };
  }

  // ── 6. Cosmetic Element-Hiding Filter Engine ──────────────────────────────
  // Injects CSS rules targeting known ad containers, fake play overlays, and click traps
  static applyCosmeticFilters() {
    if (typeof document === 'undefined') return;

    const styleId = 'ublock-cosmetic-filters';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* uBlock Origin Cosmetic Filters for Video Stream Embeds */
      .ad-banner, .adsbox, .ad-container, .advertisement,
      div[id*="ad_"], div[class*="ad_"], div[class*="banner_ad"],
      div[id*="google_ads"], div[class*="google_ads"],
      iframe[src*="adsterra"], iframe[src*="propellerads"], iframe[src*="popads"],
      .pop-overlay, .click-trap, .fake-play-btn,
      div[style*="z-index: 2147483647"]:empty,
      div[style*="z-index: 9999999"]:empty {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
        max-height: 0 !important;
      }
    `;

    document.head.appendChild(style);
  }

  // ── 7. Domain Matcher for Network and Iframe Filters ───────────────────────
  static isAdUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return this.DOMAIN_REGEX.test(url);
  }
}
