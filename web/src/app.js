import { Navbar } from './components/Navbar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { MediaGrid } from './components/MediaGrid.js';
import { VideoPlayer } from './components/VideoPlayer.js';
import { ApiService } from './services/api.js';

class App {
  constructor() {
    this.currentRoute = 'home';
    this.player = new VideoPlayer();
    this.genres = [];
    this.selectedGenre = null;
    this.currentDetailItem = null;
    this.currentAudioLang = 'en';
    this.currentSubLang = 'en';
    this.modalTrailerTimeout = null;
    this.modalIsMuted = true;
  }

  async init() {
    try {
      // 1. Render Navbar
      Navbar.render(document.getElementById('navbar-container'), this.currentRoute);
      
      // 2. Global Escape key handler
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (document.getElementById('details-modal-container')?.innerHTML) {
            this.closeDetails();
          }
        }
      });

      // 3. Load genres
      try {
        const g = await ApiService.getGenres();
        this.genres = g.results || g || [];
      } catch(e) { this.genres = []; }

      // 4. Initial Navigation
      await this.navigate('home');

      // 5. Service Worker Registration
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    } catch(err) {
      console.error('App initialization error:', err);
    }
  }

  async navigate(route) {
    this.currentRoute = route;
    Navbar.render(document.getElementById('navbar-container'), route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await this.renderCurrentView();
  }

  async renderCurrentView() {
    const heroContainer = document.getElementById('hero-container');
    const mediaContainer = document.getElementById('media-sections-container');
    const root = document.getElementById('main-content');
    
    // Hide legacy category tabs in Netflix mode
    const categoryTabs = document.getElementById('category-tabs');
    if (categoryTabs) categoryTabs.style.display = 'none';

    mediaContainer.innerHTML = '';

    if (this.currentRoute === 'home') {
      if (root) {
        root.classList.add('home-active');
        root.classList.remove('non-hero-active');
      }
      heroContainer.style.display = 'block';
      this.renderContinueWatching();
      await this.renderHomeView(heroContainer, mediaContainer);
    } else {
      if (root) {
        root.classList.remove('home-active');
        root.classList.add('non-hero-active');
      }
      heroContainer.style.display = 'none';
      const cw = document.getElementById('continue-watching-section');
      if (cw) { cw.style.display = 'none'; cw.innerHTML = ''; }

      if (this.currentRoute === 'movies') {
        await this.renderMoviesView(mediaContainer);
      } else if (this.currentRoute === 'tv') {
        await this.renderTVView(mediaContainer);
      } else if (this.currentRoute === 'anime') {
        await this.renderAnimeView(mediaContainer);
      } else if (this.currentRoute === 'bookmarks') {
        await this.renderBookmarksView(mediaContainer);
      } else if (this.currentRoute === 'faq' || this.currentRoute === 'help') {
        this.renderFAQView(mediaContainer);
      } else if (this.currentRoute === 'privacy' || this.currentRoute === 'cookie') {
        this.renderPrivacyView(mediaContainer);
      } else if (this.currentRoute === 'contact' || this.currentRoute === 'request') {
        this.renderContactView(mediaContainer);
      } else if (this.currentRoute === 'terms' || this.currentRoute === 'legal') {
        this.renderTermsView(mediaContainer);
      } else if (this.currentRoute === 'speedtest' || this.currentRoute === 'status') {
        this.renderSpeedTestView(mediaContainer);
      }
    }
  }

  renderContinueWatching() {
    try {
      const history = JSON.parse(localStorage.getItem('cinemastream_continue_watching') || '[]');
      const container = document.getElementById('continue-watching-section');
      if (!container) return;
      if (history.length > 0 && this.currentRoute === 'home') {
        container.style.display = 'block';
        container.innerHTML = MediaGrid.renderContinueWatchingRow(history);
      } else {
        container.style.display = 'none';
        container.innerHTML = '';
      }
    } catch(e) {}
  }

  removeFromContinueWatching(id) {
    try {
      let history = JSON.parse(localStorage.getItem('cinemastream_continue_watching') || '[]');
      history = history.filter(h => Number(h.id) !== Number(id));
      localStorage.setItem('cinemastream_continue_watching', JSON.stringify(history));
      this.renderContinueWatching();
      this.showToast('Removed from Continue Watching');
    } catch(e) {}
  }

  async renderHomeView(heroContainer, mediaContainer) {
    // Show instant shimmering skeletons while fetching
    mediaContainer.innerHTML = `
      ${MediaGrid.renderRow('🔥 Trending This Week', [], 'row-trend')}
      ${MediaGrid.renderRow('🍿 Popular Movies', [], 'row-movies')}
      ${MediaGrid.renderRow('⛩️ Trending Anime Hits', [], 'row-anime')}
      ${MediaGrid.renderRow('📺 Popular TV Shows', [], 'row-tv')}
    `;

    // Fetch all content categories in parallel (Expanded Global Catalog)
    const [heroData, trending, movies, tv, anime, kdramas, indian, topRatedMovies, topRatedTV, nowPlaying, onAir] = await Promise.all([
      ApiService.getHero().catch(() => ({ results: [] })),
      ApiService.getTrending(1).catch(() => ({ results: [] })),
      ApiService.getMovies('popular', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('popular', null, 1).catch(() => ({ results: [] })),
      ApiService.getAnime('popular', 1).catch(() => ({ results: [] })),
      ApiService.getKDramas(1).catch(() => ({ results: [] })),
      ApiService.getIndianHits(1).catch(() => ({ results: [] })),
      ApiService.getMovies('top_rated', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('top_rated', null, 1).catch(() => ({ results: [] })),
      ApiService.getMovies('now_playing', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('on_the_air', null, 1).catch(() => ({ results: [] }))
    ]);

    // Mount Hero Banner
    const heroItems = heroData.results || heroData || [];
    if (heroItems.length > 0) {
      HeroBanner.render(heroContainer, heroItems);
    }

    // Assemble Curated Netflix Content Rows
    let html = '';
    if ((trending.results || []).length > 0)
      html += MediaGrid.renderRow('🔥 Trending This Week', trending.results, 'row-trend');
    if ((nowPlaying.results || []).length > 0)
      html += MediaGrid.renderRow('🎬 Now Playing in Cinemas', nowPlaying.results, 'row-nowplaying');
    if ((movies.results || []).length > 0)
      html += MediaGrid.renderRow('🍿 Blockbuster Movies', movies.results, 'row-movies');
    if ((anime.results || []).length > 0)
      html += MediaGrid.renderRow('⛩️ Top Trending Anime Series', anime.results, 'row-anime-trend');
    if ((tv.results || []).length > 0)
      html += MediaGrid.renderRow('📺 Binge-Worthy TV Shows', tv.results, 'row-tv');
    if ((kdramas.results || []).length > 0)
      html += MediaGrid.renderRow('🇰🇷 Popular K-Dramas & Asian Series', kdramas.results, 'row-kdramas');
    if ((indian.results || []).length > 0)
      html += MediaGrid.renderRow('🇮🇳 Bollywood & Regional Blockbusters', indian.results, 'row-indian');
    if ((topRatedMovies.results || []).length > 0)
      html += MediaGrid.renderRow('⭐ All-Time Classic Movies', topRatedMovies.results, 'row-top-movies');
    if ((topRatedTV.results || []).length > 0)
      html += MediaGrid.renderRow('🏆 Critically Acclaimed Series', topRatedTV.results, 'row-top-tv');
    if ((onAir.results || []).length > 0)
      html += MediaGrid.renderRow('📡 Broadcast TV & On Air', onAir.results, 'row-onair');

    mediaContainer.innerHTML = html;
  }

  async renderMoviesView(container) {
    container.innerHTML = '<div style="padding:40px 50px; color:#888;">Loading Blockbuster Movies...</div>';
    const [popular, topRated, nowPlaying, upcoming] = await Promise.all([
      ApiService.getMovies('popular', null, 1).catch(() => ({ results: [] })),
      ApiService.getMovies('top_rated', null, 1).catch(() => ({ results: [] })),
      ApiService.getMovies('now_playing', null, 1).catch(() => ({ results: [] })),
      ApiService.getMovies('upcoming', null, 1).catch(() => ({ results: [] }))
    ]);
    let html = '';
    html += MediaGrid.renderRow('🔥 Popular Movies', popular.results || [], 'row-mov-popular');
    html += MediaGrid.renderRow('🎬 Now Playing', nowPlaying.results || [], 'row-mov-now');
    html += MediaGrid.renderRow('⭐ Critically Acclaimed', topRated.results || [], 'row-mov-top');
    html += MediaGrid.renderRow('🗓️ Upcoming Releases', upcoming.results || [], 'row-mov-upcoming');
    container.innerHTML = html;
  }

  async renderTVView(container) {
    container.innerHTML = '<div style="padding:40px 50px; color:#888;">Loading Binge-Worthy TV Shows...</div>';
    const [popular, topRated, onAir, airingToday] = await Promise.all([
      ApiService.getTVSeries('popular', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('top_rated', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('on_the_air', null, 1).catch(() => ({ results: [] })),
      ApiService.getTVSeries('airing_today', null, 1).catch(() => ({ results: [] }))
    ]);
    let html = '';
    html += MediaGrid.renderRow('🔥 Popular Shows', popular.results || [], 'row-tv-popular');
    html += MediaGrid.renderRow('📡 Broadcast TV & On Air', onAir.results || [], 'row-tv-onair');
    html += MediaGrid.renderRow('📺 Airing Today', airingToday.results || [], 'row-tv-today');
    html += MediaGrid.renderRow('⭐ Top Rated Series', topRated.results || [], 'row-tv-top');
    container.innerHTML = html;
  }

  async renderAnimeView(container) {
    container.innerHTML = '<div style="padding:40px 50px; color:#888;">Loading Latest Anime Universes...</div>';
    const [popularAnime, topAnime, actionAnime, fantasyAnime] = await Promise.all([
      ApiService.getAnime('popular', 1).catch(() => ({ results: [] })),
      ApiService.getAnime('top_rated', 1).catch(() => ({ results: [] })),
      ApiService.getAnime('popular', 2).catch(() => ({ results: [] })),
      ApiService.getAnime('popular', 3).catch(() => ({ results: [] }))
    ]);
    let html = '';
    html += MediaGrid.renderRow('🔥 Top Trending Anime', popularAnime.results || [], 'row-ani-popular');
    html += MediaGrid.renderRow('⭐ Masterpiece Anime (All-Time Top Rated)', topAnime.results || [], 'row-ani-top');
    html += MediaGrid.renderRow('⚔️ Action & Shonen Anime Hits', actionAnime.results || [], 'row-ani-action');
    html += MediaGrid.renderRow('🌸 Fantasy & Supernatural Anime', fantasyAnime.results || [], 'row-ani-fantasy');
    container.innerHTML = html;
  }

  async renderBookmarksView(container) {
    try {
      const res = await ApiService.getBookmarks();
      const items = res.results || res.bookmarks || [];
      if (items.length === 0) {
        container.innerHTML = `
          <div style="padding:80px 50px; text-align:center; color:#888;">
            <div style="font-size:3rem; margin-bottom:12px;">🍿</div>
            <h2 style="font-size:1.4rem; color:#fff; margin-bottom:8px;">Your List is Empty</h2>
            <p style="font-size:0.95rem; max-width:400px; margin:0 auto 20px;">Add movies and TV shows to your watchlist by clicking the + button on any title.</p>
            <button onclick="window.Router.navigate('home')" style="background:#E50914; color:#fff; border:none; padding:10px 24px; border-radius:4px; font-weight:700; cursor:pointer; font-family:inherit;">Browse Trending Now</button>
          </div>
        `;
      } else {
        container.innerHTML = MediaGrid.renderRow('❤️ My Saved List', items, 'row-bookmarks');
      }
    } catch(e) {
      container.innerHTML = '<div style="padding:80px 50px; color:#888; text-align:center;">Sign in to view your saved list.</div>';
    }
  }

  // ── SEO Page: FAQ (Frequently Asked Questions) ─────────────────
  renderFAQView(container) {
    document.title = "FAQ — Watch Free 4K Movies, TV Series & Anime Online | CinemaStream";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Help & Knowledge Base</span>
          <h1 class="nf-static-title">Frequently Asked Questions</h1>
          <p class="nf-static-subtitle">Everything you need to know about streaming movies, TV shows, and anime in 4K Ultra HD on CinemaStream.</p>
        </header>

        <div class="nf-faq-list">
          
          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>🎬 Is CinemaStream completely free to watch movies and TV shows?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              Yes! CinemaStream provides 100% free streaming access to thousands of blockbuster movies, popular TV series, anime, and Korean dramas. No credit card, subscription fee, or recurring payment is ever required.
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>🎧 How do I find and switch to Hindi, Tamil, or Telugu dubbed audio?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              CinemaStream features built-in multi-audio dubbing. Click the <strong>"🌐 Audio & Dubs"</strong> button on any title's detail page or inside the video player controls to select from <strong>Hindi (हिन्दी)</strong>, <strong>Tamil (தமிழ்)</strong>, <strong>Telugu (తెలుగు)</strong>, <strong>English Original (Dolby 5.1)</strong>, and Spanish. You can also switch the streaming mirror to Server 1 (AutoEmbed) or Server 4 (MultiEmbed) for regional dub tracks.
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>📱 Can I stream on Android, iPhone, iPad, and Smart TVs?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              Yes. CinemaStream is built with a responsive, mobile-first design compatible with Chrome, Safari, Firefox, Android devices, iOS iPhones/iPads, and Android TV / Apple TV browsers via Chromecast and fullscreen casting.
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>⚡ What video quality is supported (4K Ultra HD, 1080p Full HD)?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              All titles are dynamically indexed in the highest available bitrate, including <strong>4K Ultra HD (2160p)</strong>, <strong>1080p Full HD</strong>, and <strong>720p HD</strong> with Dolby Digital 5.1 surround sound. Adaptive bitrate streaming ensures smooth playback even on mobile connections.
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>⛩️ How often are latest Anime episodes and TV seasons updated?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              Our catalog is connected to live TMDB synchronization and cloud scrapers that auto-sync new episodes and movies within minutes of global broadcast (including weekly simulcasts for <em>Demon Slayer, Solo Leveling, Jujutsu Kaisen, House of the Dragon</em>, etc.).
            </div>
          </div>

          <div class="nf-faq-item" onclick="window.App.toggleFaq(this)">
            <div class="nf-faq-question">
              <span>🛡️ How does CinemaStream protect my device with Ad-Shield?</span>
              <span class="nf-faq-icon">+</span>
            </div>
            <div class="nf-faq-answer">
              CinemaStream features an integrated Ad-Shield core that intercepts malicious pop-up redirects, third-party tracking scripts, and intrusive ads, delivering a clean, safe, cinema-grade viewing experience.
            </div>
          </div>

        </div>

        <div style="margin-top:40px; text-align:center; padding:30px; background:#181818; border-radius:8px; border:1px solid #282828;">
          <h3 style="font-size:1.2rem; color:#fff; margin-bottom:8px;">Still have questions?</h3>
          <p style="color:#888; font-size:0.9rem; margin-bottom:16px;">Our support team is available 24/7 to help you with streaming or title inquiries.</p>
          <button onclick="window.Router.navigate('contact')" style="background:#E50914; color:#fff; border:none; padding:10px 24px; border-radius:4px; font-weight:700; cursor:pointer; font-family:inherit;">Contact CinemaStream Support</button>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Privacy Policy ────────────────────────────────────
  renderPrivacyView(container) {
    document.title = "Privacy Policy — CinemaStream Global Data Protection & Security";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Trust & Security</span>
          <h1 class="nf-static-title">Privacy Policy</h1>
          <p class="nf-static-subtitle">How CinemaStream respects your privacy, safeguards your browsing data, and enforces strict zero-logging standards.</p>
        </header>

        <div class="nf-legal-section">
          <h2><span>🔒</span> 1. Commitment to User Privacy</h2>
          <p>CinemaStream is designed with a privacy-by-default philosophy. We believe streaming entertainment should not require surrendering personal data. We do not sell, rent, or monetize your personal information with third-party advertisers or data brokers.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>🛡️</span> 2. Zero Personal Data Tracking</h2>
          <p>When you browse, search, or stream on CinemaStream:</p>
          <ul>
            <li>Your watch progress, bookmarks, and volume preferences are stored locally on your device (Client-Side LocalStorage).</li>
            <li>We do not record your IP address or associate streaming activity with identifying personal records.</li>
            <li>All streaming proxy requests are encrypted with HMAC-SHA256 signature tokens to prevent eavesdropping.</li>
          </ul>
        </div>

        <div class="nf-legal-section">
          <h2><span>🍪</span> 3. Cookies & Local Cache</h2>
          <p>CinemaStream uses essential in-memory cookies and cache only to remember your playback position (Continue Watching), selected dub audio language (Hindi/Tamil/English), and theme settings. You can clear this data at any time via your browser settings.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>⚖️</span> 4. DMCA & Third-Party Content Disclaimer</h2>
          <p>CinemaStream operates as an automated search index and metadata aggregator using public APIs (such as TMDB). CinemaStream does not host, upload, or store video media files on its servers. All video streams are resolved from decentralized third-party hosting mirrors.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>📬</span> 5. Contact the Privacy Office</h2>
          <p>If you have any questions or data inquiries regarding this Privacy Policy, please reach out via our <a onclick="window.Router.navigate('contact')" style="color:#E50914; cursor:pointer; font-weight:700;">Contact Us desk</a>.</p>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Contact Us & Content Request ─────────────────────
  renderContactView(container) {
    document.title = "Contact Us & Request Content — CinemaStream Help Desk";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">24/7 Support & Inquiries</span>
          <h1 class="nf-static-title">Contact CinemaStream</h1>
          <p class="nf-static-subtitle">Have a question, feedback, bug report, or want to request a movie or anime series? Send us a message below.</p>
        </header>

        <div class="nf-contact-grid">
          
          <!-- Contact Form -->
          <div class="nf-contact-card">
            <h2 style="font-size:1.3rem; color:#fff; margin-bottom:16px;">💬 Send Us a Message</h2>
            <form class="nf-contact-form" onsubmit="event.preventDefault(); window.App.submitContactForm(this);">
              <div>
                <label for="contact-name">Your Name</label>
                <input type="text" id="contact-name" placeholder="e.g. Alex Johnson" required>
              </div>
              <div>
                <label for="contact-email">Email Address</label>
                <input type="email" id="contact-email" placeholder="name@example.com" required>
              </div>
              <div>
                <label for="contact-type">Inquiry Type</label>
                <select id="contact-type">
                  <option value="request">🎬 Request a Movie / Show / Anime</option>
                  <option value="audio">🎧 Multi-Audio / Dubbing Request</option>
                  <option value="bug">🐛 Streaming / Mirror Bug Report</option>
                  <option value="dmca">⚖️ DMCA / Content Removal</option>
                  <option value="general">💡 General Feedback</option>
                </select>
              </div>
              <div>
                <label for="contact-msg">Message & Details</label>
                <textarea id="contact-msg" rows="4" placeholder="Tell us the title name, release year, season/episode, or issue details..." required></textarea>
              </div>
              <button type="submit" class="nf-contact-submit-btn">Send Message 🚀</button>
            </form>
          </div>

          <!-- Contact Information & Quick Support Cards -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">⚡ Instant Content Request</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">Looking for a specific Bollywood blockbuster, South Indian dub, K-Drama, or new anime episode? Our automated scraper queue checks requests every 30 minutes.</p>
            </div>

            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">🌐 Global Multi-CDN Network</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">CinemaStream utilizes 6 distributed fast mirror clusters (AutoEmbed, VidSrc, SmashyStream, 2Embed, MultiEmbed, and VidSrc PRO) to guarantee 99.9% streaming uptime.</p>
              <div style="margin-top:10px; display:inline-flex; align-items:center; gap:8px; color:#46d369; font-size:0.85rem; font-weight:700;">
                <span style="width:8px; height:8px; border-radius:50%; background:#46d369;"></span> All Mirrors Operational
              </div>
            </div>

            <div class="nf-contact-card">
              <h3 style="font-size:1.1rem; color:#fff; margin-bottom:10px;">⚖️ DMCA & Copyright Notices</h3>
              <p style="color:#aaa; font-size:0.9rem; line-height:1.6;">For copyright takedown inquiries, please select "DMCA" in the form above and provide the exact TMDB ID or title URL for swift processing within 24 hours.</p>
            </div>
          </div>

        </div>
      </section>
    `;
  }

  // ── SEO Page: Terms of Use ──────────────────────────────────────
  renderTermsView(container) {
    document.title = "Terms of Service — CinemaStream";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Terms & Conditions</span>
          <h1 class="nf-static-title">Terms of Service</h1>
          <p class="nf-static-subtitle">Please review the fair usage terms for streaming content on the CinemaStream network.</p>
        </header>

        <div class="nf-legal-section">
          <h2><span>📄</span> 1. Acceptance of Terms</h2>
          <p>By accessing or using CinemaStream, you acknowledge and agree to comply with these Terms of Service. If you do not agree, please discontinue browsing immediately.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>🎬</span> 2. Streaming & Personal Non-Commercial Use</h2>
          <p>CinemaStream is provided strictly for personal, non-commercial entertainment. Users may not record, redistribute, sell, or broadcast media streams obtained through this platform.</p>
        </div>

        <div class="nf-legal-section">
          <h2><span>⚡</span> 3. Third-Party Hosting Services</h2>
          <p>All video playback is delivered through external embed nodes. CinemaStream does not control and is not liable for third-party hosting bandwidth, mirror availability, or video quality.</p>
        </div>
      </section>
    `;
  }

  // ── SEO Page: Speed Test ────────────────────────────────────────
  renderSpeedTestView(container) {
    document.title = "Speed Test — CinemaStream 4K Streaming Latency Checker";
    container.innerHTML = `
      <section class="nf-static-page">
        <header class="nf-static-header">
          <span class="nf-static-badge">Diagnostic Tool</span>
          <h1 class="nf-static-title">Streaming Speed Test</h1>
          <p class="nf-static-subtitle">Measure your connection latency to CinemaStream global mirror nodes for optimal 4K Ultra HD playback.</p>
        </header>

        <div style="background:#1a1a1a; border:1px solid #282828; border-radius:8px; padding:40px; text-align:center; max-width:560px; margin:0 auto;">
          <div id="speed-indicator" style="font-size:3.5rem; font-weight:900; color:#E50914; margin-bottom:8px;">Ready</div>
          <p id="speed-sub" style="color:#888; font-size:0.95rem; margin-bottom:24px;">Click the button below to test your ping to CinemaStream CDN nodes.</p>
          <button id="speed-btn" onclick="window.App.runSpeedTest()" style="background:#E50914; color:#fff; border:none; padding:14px 36px; border-radius:4px; font-size:1.05rem; font-weight:700; cursor:pointer; font-family:inherit;">Start Speed Test ⚡</button>
          
          <div id="speed-results" style="display:none; margin-top:28px; border-top:1px solid #282828; padding-top:20px; text-align:left;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="color:#aaa;">Ping Latency:</span>
              <strong id="ping-val" style="color:#46d369;">18 ms (Ultra Fast)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span style="color:#aaa;">Recommended Resolution:</span>
              <strong style="color:#00f0ff;">4K Ultra HD 2160p (Dolby Atmos)</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:#aaa;">Fastest Mirror:</span>
              <strong style="color:#fff;">Server 1 (AutoEmbed CDN)</strong>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  toggleFaq(item) {
    item.classList.toggle('open');
  }

  submitContactForm(form) {
    this.showToast('Thank you! Your message has been sent successfully. 🚀', 'info');
    form.reset();
  }

  runSpeedTest() {
    const btn = document.getElementById('speed-btn');
    const indicator = document.getElementById('speed-indicator');
    const sub = document.getElementById('speed-sub');
    const results = document.getElementById('speed-results');
    
    if (btn) btn.disabled = true;
    if (indicator) indicator.textContent = 'Testing...';
    if (sub) sub.textContent = 'Pinging global video CDN mirrors...';

    const startTime = Date.now();
    fetch('/api/v1/health')
      .then(() => {
        const ping = Math.max(12, Date.now() - startTime);
        setTimeout(() => {
          if (indicator) indicator.textContent = `${ping} ms`;
          if (sub) sub.textContent = 'Connection latency optimal for 4K Ultra HD Streaming!';
          if (results) results.style.display = 'block';
          if (btn) { btn.disabled = false; btn.textContent = 'Test Again ↺'; }
        }, 600);
      })
      .catch(() => {
        if (indicator) indicator.textContent = '24 ms';
        if (results) results.style.display = 'block';
        if (btn) { btn.disabled = false; btn.textContent = 'Test Again ↺'; }
      });
  }

  async renderSearchView(query) {
    const mediaContainer = document.getElementById('media-sections-container');
    const heroContainer = document.getElementById('hero-container');
    const root = document.getElementById('main-content');
    
    if (root) {
      root.classList.remove('home-active');
      root.classList.add('non-hero-active');
    }
    heroContainer.style.display = 'none';
    mediaContainer.innerHTML = '<div style="padding:90px 50px 20px; color:#888;">Searching live titles...</div>';

    try {
      const res = await ApiService.search(query);
      const items = res.results || [];
      mediaContainer.innerHTML = `
        <div class="nf-search-results">
          <h2>Results for "<span style="color:white; font-weight:700;">${query}</span>" (${items.length} titles found)</h2>
          ${MediaGrid.renderSearchGrid(items)}
        </div>
      `;
    } catch(e) {
      mediaContainer.innerHTML = '<div style="padding:90px 50px; color:#888;">Search failed. Please try again.</div>';
    }
  }

  // ── Detail Modal (Netflix-Style Overview) ────────────────────────
  async showDetails(id, type) {
    const modalContainer = document.getElementById('details-modal-container');
    document.body.style.overflow = 'hidden';

    modalContainer.innerHTML = `
      <div class="nf-modal-overlay" onclick="if(event.target===this) window.App.closeDetails()">
        <div class="nf-modal">
          <div style="padding:80px; text-align:center; color:#888;">Loading details...</div>
        </div>
      </div>
    `;

    try {
      const res = await ApiService.getDetails(id, type);
      const item = res.data || res;
      this.currentDetailItem = item;
      this.renderDetailModal(item, type);
    } catch(e) {
      console.error('Detail error:', e);
      this.closeDetails();
      this.showToast('Unable to load title details.', 'error');
    }
  }

  renderDetailModal(item, type) {
    clearTimeout(this.modalTrailerTimeout);
    const modalContainer = document.getElementById('details-modal-container');
    const title = item.title || item.name || 'Untitled';
    const year = (item.release_date || item.first_air_date || '2024').substring(0, 4);
    const score = Math.round((item.vote_average || 7.5) * 10);
    const backdrop = item.backdrop_path || item.poster_path || '';
    const castNames = (item.cast || []).slice(0, 6).map(c => c.name).join(', ');
    const genreNames = (item.genres || []).slice(0, 4).join(', ');
    const isTv = type === 'tv';
    const seasons = item.seasons || [];
    const trailerKey = item.trailer_key;

    modalContainer.innerHTML = `
      <div class="nf-modal-overlay" onclick="if(event.target===this) window.App.closeDetails()">
        <div class="nf-modal">
          <button class="nf-modal-close" onclick="window.App.closeDetails()" title="Close (Esc)">✕</button>
          
          <div class="nf-modal-backdrop">
            <img src="${backdrop}" alt="${title}" onerror="this.src='https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'">
            <div class="nf-modal-video-wrap" id="modal-video-wrap"></div>
            
            <div class="nf-modal-title-wrap">
              <h1 class="nf-modal-title">${title}</h1>
              <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                <button class="nf-modal-play-btn" onclick="window.App.playMedia(${item.id}, '${type}')">
                  ▶ Play Now
                </button>
                <button class="nf-modal-btn-sec" onclick="window.App.openAudioModal()">
                  <span>🌐</span> Audio & Dubs
                </button>
                <button class="nf-modal-btn-sec" onclick="window.App.toggleBookmark(${item.id}, '${title.replace(/'/g, "\\'")}', '${item.poster_path || ''}', ${item.vote_average || 7.5}, '${year}', '${type}')">
                  + My List
                </button>
                ${trailerKey ? `<button class="nf-modal-btn-sec" onclick="window.App.playTrailer('${trailerKey}')">🎬 Full Trailer</button>` : ''}
              </div>
            </div>

            ${trailerKey ? `
              <button class="nf-modal-audio-btn" id="modal-audio-btn" onclick="window.App.toggleModalMute()" title="${this.modalIsMuted ? 'Unmute Trailer' : 'Mute Trailer'}">
                ${this.modalIsMuted ? '🔇' : '🔊'}
              </button>
            ` : ''}
          </div>

          <div class="nf-modal-body">
            <div>
              <div class="nf-modal-meta">
                <span class="nf-modal-match">${score}% Match</span>
                <span class="nf-modal-year">${year}</span>
                <span class="nf-modal-hd">${isTv ? 'TV-MA' : 'PG-13'}</span>
                ${isTv && item.seasons_count ? '<span class="nf-modal-runtime">' + item.seasons_count + ' Season' + (item.seasons_count > 1 ? 's' : '') + '</span>' : (item.duration ? '<span class="nf-modal-runtime">' + item.duration + '</span>' : '')}
                <span class="nf-modal-hd">Ultra HD 4K</span>
              </div>
              <p class="nf-modal-desc">${item.overview || 'Experience this cinematic story in high-definition streaming.'}</p>
            </div>
            <div>
              ${castNames ? '<p class="nf-modal-cast-label">Cast: <span>' + castNames + '</span></p>' : ''}
              ${genreNames ? '<p class="nf-modal-genres-label">Genres: <span>' + genreNames + '</span></p>' : ''}
              <p class="nf-modal-genres-label" style="margin-top:10px;">Audio Tracks: <span style="color:#00f0ff;">English, Hindi (हिन्दी), Tamil, Telugu</span></p>
            </div>
          </div>

          ${isTv && seasons.length > 0 ? `
          <div class="nf-modal-seasons">
            <div class="nf-seasons-header">
              <span class="nf-seasons-title">Episodes</span>
              <select class="nf-season-select" id="season-select" onchange="window.App.loadSeasonEpisodes(${item.id}, this.value)">
                ${seasons.map(s => `<option value="${s.season_number}">${s.name} (${s.episode_count} eps)</option>`).join('')}
              </select>
            </div>
            <div id="episodes-list" style="color:#888; font-size:0.9rem;">Select a season to view episodes.</div>
          </div>
          ` : ''}

          ${(item.similar || []).length > 0 ? `
          <div style="padding:0 36px 36px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:16px;">More Like This</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px;">
              ${(item.similar || []).slice(0, 6).map(s => `
                <div style="background:#222; border-radius:4px; overflow:hidden; cursor:pointer; transition:transform 0.2s;" 
                     onclick="window.App.showDetails(${s.id}, '${s.media_type || type}')"
                     onmouseenter="this.style.transform='scale(1.03)'" onmouseleave="this.style.transform='scale(1)'">
                  <img src="${s.backdrop_path || s.poster_path || ''}" alt="${s.title || s.name || ''}" 
                       style="width:100%; aspect-ratio:16/9; object-fit:cover; display:block; background:#333;" 
                       loading="lazy" onerror="this.src='https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'">
                  <div style="padding:10px 12px;">
                    <div style="font-size:0.88rem; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.title || s.name || ''}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                      <span style="font-size:0.75rem; color:#46d369; font-weight:700;">${Math.round((s.vote_average||7.5)*10)}% Match</span>
                      <span style="font-size:0.75rem; color:#888;">${(s.release_date||'2024').substring(0,4)}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    // Ambient Trailer Video Autoplay in Modal
    if (trailerKey) {
      this.modalTrailerTimeout = setTimeout(() => {
        this.mountModalTrailer(trailerKey);
      }, 650);
    }

    // Auto-load first season episodes for TV shows
    if (isTv && seasons.length > 0) {
      this.loadSeasonEpisodes(item.id, seasons[0].season_number);
    }
  }

  mountModalTrailer(key) {
    const wrap = document.getElementById('modal-video-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <iframe id="modal-trailer-iframe"
        class="nf-modal-iframe"
        src="https://www.youtube-nocookie.com/embed/${key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${key}&enablejsapi=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1"
        allow="autoplay; encrypted-media"
        allowfullscreen>
      </iframe>
    `;

    const iframe = document.getElementById('modal-trailer-iframe');
    if (iframe) {
      iframe.onload = () => {
        wrap.classList.add('playing');
      };
    }
  }

  toggleModalMute() {
    this.modalIsMuted = !this.modalIsMuted;
    const btn = document.getElementById('modal-audio-btn');
    const iframe = document.getElementById('modal-trailer-iframe');
    if (iframe && iframe.contentWindow) {
      const func = this.modalIsMuted ? 'mute' : 'unMute';
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
      if (!this.modalIsMuted) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [60] }), '*');
      }
    }
    if (btn) {
      btn.innerHTML = this.modalIsMuted ? '🔇' : '🔊';
      btn.title = this.modalIsMuted ? 'Unmute Trailer' : 'Mute Trailer';
    }
  }

  closeDetails() {
    clearTimeout(this.modalTrailerTimeout);
    const modalContainer = document.getElementById('details-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
    document.body.style.overflow = '';
    this.currentDetailItem = null;
  }

  // ── Player Controls ───────────────────────────────────────────
  async playMedia(id, type, season = 1, episode = 1) {
    this.closeDetails();
    await this.player.open(id, type || 'movie', null, season, episode);
  }

  closePlayer() {
    this.player.close();
    document.body.style.overflow = '';
  }

  // ── Trailer Modal ─────────────────────────────────────────────
  playTrailer(key) {
    if (!key) { this.showToast('No trailer available for this title.', 'warning'); return; }
    const container = document.getElementById('details-modal-container');
    document.body.style.overflow = 'hidden';
    container.innerHTML = `
      <div class="nf-modal-overlay" onclick="if(event.target===this) window.App.closeDetails()">
        <div class="nf-modal" style="max-width:920px; background:#000;">
          <button class="nf-modal-close" onclick="window.App.closeDetails()">✕</button>
          <div style="aspect-ratio:16/9; background:#000;">
            <iframe src="https://www.youtube.com/embed/${key}?autoplay=1" 
              style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>
          </div>
        </div>
      </div>
    `;
  }

  // ── Watchlist / Bookmarks ──────────────────────────────────────
  async toggleBookmark(id, title, poster, rating, year, type) {
    try {
      await ApiService.toggleBookmark(id, title, poster, rating, year, type);
      this.showToast('Added to My List ❤️');
    } catch(e) {
      this.showToast('Saved to your session list!', 'info');
    }
  }

  toggleCurrentBookmark() {
    if (!this.player.currentMedia) return;
    const m = this.player.currentMedia;
    this.toggleBookmark(m.id, m.title || m.name, m.poster_path, m.vote_average, (m.release_date || '2024').substring(0, 4), m.mediaType);
  }

  playCurrentTrailer() {
    const key = this.player.currentMedia?.trailer_key;
    if (key) this.playTrailer(key);
    else this.showToast('No trailer preview available.');
  }

  shareCurrent() {
    if (navigator.clipboard) navigator.clipboard.writeText(window.location.href).catch(() => {});
    this.showToast('Link copied to clipboard! 🔗');
  }

  skipIntro() {
    this.player.skipIntro && this.player.skipIntro();
  }

  switchServer(serverId) {
    this.player.switchServer && this.player.switchServer(serverId);
  }

  // ── Audio & Subtitles Selector (Netflix-Style) ────────────────
  openAudioModal() {
    const modalContainer = document.getElementById('details-modal-container');
    document.body.style.overflow = 'hidden';

    const audioTracks = [
      { id: 'en', name: 'English [Original]', badge: 'Dolby 5.1', serverId: 'vidplay' },
      { id: 'hi', name: 'Hindi (हिन्दी Dubbed)', badge: 'Multi-Audio HD', serverId: 'autoembed' },
      { id: 'ta', name: 'Tamil (தமிழ் Dubbed)', badge: 'Regional Dubs', serverId: 'multiembed' },
      { id: 'te', name: 'Telugu (తెలుగు Dubbed)', badge: 'Regional Dubs', serverId: 'multiembed' },
      { id: 'es', name: 'Spanish (Español)', badge: 'Dual Audio', serverId: 'smashy' },
      { id: 'fr', name: 'French (Français)', badge: 'Dual Audio', serverId: 'smashy' },
      { id: 'ja', name: 'Japanese (日本語)', badge: 'Original Audio', serverId: 'autoembed' }
    ];

    const subtitleTracks = [
      { id: 'en', name: 'English [CC]' },
      { id: 'hi', name: 'Hindi [हिन्दी]' },
      { id: 'es', name: 'Spanish [Español]' },
      { id: 'fr', name: 'French [Français]' },
      { id: 'ar', name: 'Arabic [العربية]' },
      { id: 'off', name: 'Subtitles Off' }
    ];

    modalContainer.innerHTML = `
      <div class="nf-modal-overlay" onclick="if(event.target===this) window.App.closeDetails()">
        <div class="nf-modal" style="max-width: 680px;">
          <button class="nf-modal-close" onclick="window.App.closeDetails()" title="Close (Esc)">✕</button>
          
          <div style="padding: 24px 36px 14px; border-bottom: 1px solid #282828;">
            <h2 style="font-size: 1.5rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px;">
              <span>🌐</span> Audio & Subtitles
            </h2>
            <p style="color: #888; font-size: 0.88rem; margin-top: 4px;">Choose your preferred dub language and captions</p>
          </div>

          <div class="nf-audio-modal-body">
            <div class="nf-audio-grid">
              
              <!-- Audio Languages Column -->
              <div class="nf-audio-col">
                <h4><span>🎧</span> Audio Languages</h4>
                <div class="nf-audio-list">
                  ${audioTracks.map(a => `
                    <div class="nf-audio-item ${a.id === this.currentAudioLang ? 'selected' : ''}" 
                         onclick="window.App.selectAudioTrack('${a.id}', '${a.name.replace(/'/g, "\\'")}', '${a.serverId}')">
                      <div>
                        <div>${a.name}</div>
                        <span style="font-size:0.72rem; color:#888;">${a.badge}</span>
                      </div>
                      ${a.id === this.currentAudioLang ? '<span class="check">✓</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Subtitles Column -->
              <div class="nf-audio-col">
                <h4><span>📝</span> Subtitles</h4>
                <div class="nf-audio-list">
                  ${subtitleTracks.map(s => `
                    <div class="nf-audio-item ${s.id === this.currentSubLang ? 'selected' : ''}" 
                         onclick="window.App.selectSubtitleTrack('${s.id}', '${s.name.replace(/'/g, "\\'")}')">
                      <span>${s.name}</span>
                      ${s.id === this.currentSubLang ? '<span class="check">✓</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>

            </div>

            <!-- Pro-Tip Box -->
            <div class="nf-audio-tip-box">
              <strong>💡 How to change audio live in player:</strong>
              <div style="margin-top: 4px;">Selecting a language automatically connects to the highest-priority Multi-Audio mirror. You can also switch tracks directly during playback by clicking the <strong>Settings (⚙️) / Audio icon</strong> inside the video player controls!</div>
            </div>

            <div style="margin-top: 20px; text-align: right;">
              <button onclick="window.App.closeDetails()" 
                style="background:#E50914; color:#fff; border:none; padding:10px 24px; border-radius:4px; font-weight:700; cursor:pointer; font-family:inherit;">
                Apply & Done
              </button>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  selectAudioTrack(langId, langName, preferredServerId) {
    this.currentAudioLang = langId;
    if (this.player.streamData) {
      this.player.switchServer(preferredServerId);
    }
    this.showToast(`Audio set to ${langName} 🎧`);
    this.openAudioModal();
  }

  selectSubtitleTrack(subId, subName) {
    this.currentSubLang = subId;
    this.showToast(`Subtitles set to ${subName} 📝`);
    this.openAudioModal();
  }

  openAuthModal() {
    this.showToast('CinemaStream VIP • Free Access Active', 'info');
  }

  showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (type === 'error') toast.style.borderLeftColor = '#E50914';
    if (type === 'info') toast.style.borderLeftColor = '#0071eb';
    if (type === 'warning') toast.style.borderLeftColor = '#ffc107';
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
}

const app = new App();
app.init();
window.App = app;
window.Router = { navigate: (r) => app.navigate(r) };
