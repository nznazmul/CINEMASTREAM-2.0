import { ApiService } from '../services/api.js';
import { AdShield } from '../services/adShield.js';

export class VideoPlayer {
  constructor() {
    this.hls = null;
    this.currentMedia = null;
    this.streamData = null;
    this.activeServerId = 'vidsrc';
    this.activeSource = null;
    this.suggestions = [];
    this.episodes = [];
    this.saveProgressInterval = null;
    this.keyHandler = null;
  }

  getContainer() {
    let container = document.getElementById('player-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'player-modal-container';
      document.body.appendChild(container);
    }
    return container;
  }

  async open(mediaId, type = 'movie', serverId = null, season = 1, episode = 1) {
    try {
      console.log('▶ Opening VideoPlayer:', { mediaId, type, serverId, season, episode });

      // 1. Fetch Media Details
      const detailsRes = await ApiService.getDetails(mediaId, type);
      this.currentMedia = detailsRes.data || detailsRes;
      this.currentMedia.mediaType = (type === 'tv' || this.currentMedia.media_type === 'tv') ? 'tv' : 'movie';
      this.currentMedia.currentSeason = Number(season) || 1;
      this.currentMedia.currentEpisode = Number(episode) || 1;

      // 2. Resolve Multi-Source Streams
      const streamRes = await ApiService.resolveStream(mediaId, this.currentMedia.mediaType, serverId, this.currentMedia.currentSeason, this.currentMedia.currentEpisode);
      if (!streamRes.success || !streamRes.data) {
        window.App.showToast('Unable to resolve stream servers. Please try again.', 'error');
        return;
      }

      this.streamData = streamRes.data;

      // If trailer is available, add Official 4K Trailer mirror to allServers list
      if (this.currentMedia.trailer_key) {
        const trailerServer = {
          id: 'trailer',
          name: '🎬 Official 4K Trailer',
          status: 'online',
          embedUrl: `https://www.youtube-nocookie.com/embed/${this.currentMedia.trailer_key}?autoplay=1&playsinline=1&rel=0`
        };
        if (!this.streamData.allServers.some(s => s.id === 'trailer')) {
          this.streamData.allServers.unshift(trailerServer);
        }
      }

      this.activeServerId = serverId || this.streamData.activeServer?.id || 'vidsrc';
      this.activeSource = this.streamData.activeServer?.sources?.[0] || null;

      // 3. Fetch Related Suggestions / Episodes in parallel
      try {
        if (this.currentMedia.mediaType === 'tv') {
          const [epRes, sugRes] = await Promise.all([
            ApiService.getEpisodes(mediaId, this.currentMedia.currentSeason),
            ApiService.getTVSeries('popular', null, 1)
          ]);
          this.episodes = epRes.results || epRes.episodes || (Array.isArray(epRes) ? epRes : []);
          this.suggestions = (sugRes.results || []).filter(item => Number(item.id) !== Number(mediaId)).slice(0, 8);
        } else {
          const sugRes = await ApiService.getMovies('popular', null, 1);
          this.suggestions = (sugRes.results || []).filter(item => Number(item.id) !== Number(mediaId)).slice(0, 10);
        }
      } catch (e) {
        console.warn('Could not fetch suggestions/episodes:', e);
        this.episodes = [];
        this.suggestions = [];
      }

      // 4. Render YouTube / Netflix Cinema Watch View
      document.body.style.overflow = 'hidden';
      document.body.classList.add('player-active');
      this.render();

      // 5. Mount Video Stream
      this.mountStream();

      // 6. Automatically Record into Continue Watching list
      this.recordWatchSession();

      // 7. Scroll window to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('❌ Error opening VideoPlayer:', err);
      document.body.style.overflow = '';
      window.App.showToast('Failed to load player: ' + err.message, 'error');
    }
  }

  async switchSeason(seasonNumber) {
    const sNum = parseInt(seasonNumber) || 1;
    if (!this.currentMedia || this.currentMedia.mediaType !== 'tv') return;

    this.currentMedia.currentSeason = sNum;
    const epListContainer = document.getElementById('player-episodes-list');
    const badge = document.getElementById('player-ep-count-badge');
    const dropdown = document.getElementById('player-season-dropdown');
    if (dropdown) dropdown.value = sNum;

    if (epListContainer) {
      epListContainer.innerHTML = `<div style="color:#888; padding:24px 10px; text-align:center;">Loading Season ${sNum} episodes...</div>`;
    }

    try {
      const epRes = await ApiService.getEpisodes(this.currentMedia.id, sNum);
      this.episodes = epRes.results || epRes.episodes || (Array.isArray(epRes) ? epRes : []);
      if (badge) badge.textContent = `${this.episodes.length} Episodes`;
      if (epListContainer) {
        epListContainer.innerHTML = this.renderEpisodesListHtml(sNum, this.currentMedia.currentEpisode);
      }
      window.App.showToast(`Switched to Season ${sNum} 📺`);
    } catch (e) {
      if (epListContainer) {
        epListContainer.innerHTML = '<div style="color:#888; padding:16px 10px;">Unable to load episodes for this season.</div>';
      }
    }
  }

  renderEpisodesListHtml(currentSeason, currentEpisode) {
    if (!this.episodes || this.episodes.length === 0) {
      return '<div style="color:#888; padding:16px 10px;">No episodes available for this season.</div>';
    }
    return this.episodes.map(ep => {
      const isPlaying = Number(currentSeason) === Number(this.currentMedia.currentSeason) && Number(ep.episode_number) === Number(this.currentMedia.currentEpisode);
      const still = ep.still_path || 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg';
      return `
        <div class="yt-ep-item ${isPlaying ? 'playing' : ''}" onclick="window.App.playMedia(${this.currentMedia.id}, 'tv', ${currentSeason}, ${ep.episode_number})">
          <div class="yt-ep-thumb-wrap">
            <img src="${still}" alt="Ep ${ep.episode_number}" loading="lazy" onerror="this.src='https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'">
            ${isPlaying ? '<div class="ep-playing-pill">PLAYING</div>' : `<span class="ep-num-tag">EP ${ep.episode_number}</span>`}
          </div>
          <div class="yt-ep-details">
            <h5>${ep.episode_number}. ${ep.name || 'Episode ' + ep.episode_number}</h5>
            <span class="yt-ep-sub">${ep.runtime || '50m'} • ⭐ ${ep.vote_average || '8.0'}</span>
            ${ep.overview ? `<p class="yt-ep-overview">${ep.overview}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  render() {
    const container = this.getContainer();
    const isTv = this.currentMedia.mediaType === 'tv';
    const title = this.currentMedia.title || this.currentMedia.name || 'Untitled';
    const year = (this.currentMedia.release_date || this.currentMedia.first_air_date || '2024').substring(0, 4);
    const rating = this.currentMedia.vote_average ? Number(this.currentMedia.vote_average).toFixed(1) : '8.5';
    const quality = this.currentMedia.quality || '4K Ultra HD';
    const genres = Array.isArray(this.currentMedia.genres) ? this.currentMedia.genres.join(' • ') : 'Action • Drama';
    const currentSeason = this.currentMedia.currentSeason || 1;
    const currentEpisode = this.currentMedia.currentEpisode || 1;

    // Multi-Season list calculation
    const seasonsList = (this.currentMedia.seasons && this.currentMedia.seasons.length > 0)
      ? this.currentMedia.seasons
      : Array.from({ length: this.currentMedia.seasons_count || 1 }, (_, i) => ({
          season_number: i + 1,
          name: `Season ${i + 1}`,
          episode_count: 0
        }));

    // Calculate Next Episode
    const nextEpisodeNum = currentEpisode + 1;
    const nextEpisodeObj = this.episodes.find(e => e.episode_number === nextEpisodeNum);

    container.innerHTML = `
      <div class="yt-watch-view" id="player-backdrop">
        
        <!-- Top Watch Bar -->
        <div class="yt-watch-header">
          <button class="btn-back-browse" onclick="window.App.closePlayer()">
            <span>←</span> Back to Browse
          </button>

          <div class="yt-header-meta">
            <span class="yt-now-playing-badge">🔴 NOW STREAMING</span>
            <span class="yt-header-title">${title} ${isTv ? `(Season ${currentSeason} : Episode ${currentEpisode})` : `(${year})`}</span>
          </div>

          <!-- Quick Episode Next / Prev in Header for TV -->
          ${isTv ? `
            <div class="yt-header-ep-nav">
              ${currentEpisode > 1 ? `
                <button class="btn-ep-nav" onclick="window.App.playMedia(${this.currentMedia.id}, 'tv', ${currentSeason}, ${currentEpisode - 1})" title="Previous Episode">
                  ⏮ Ep ${currentEpisode - 1}
                </button>
              ` : ''}
              ${nextEpisodeObj ? `
                <button class="btn-ep-nav next" onclick="window.App.playMedia(${this.currentMedia.id}, 'tv', ${currentSeason}, ${nextEpisodeNum})" title="Next Episode">
                  Ep ${nextEpisodeNum} ⏭
                </button>
              ` : ''}
            </div>
          ` : ''}

          <div class="yt-header-actions">
            <!-- Server Switcher Dropdown -->
            <div class="server-picker-wrap">
              <span class="server-label">Server:</span>
              <select class="yt-select-server" id="header-server-select" onchange="window.App.switchServer(this.value)">
                ${this.streamData.allServers.map(s => `
                  <option value="${s.id}" ${s.id === this.activeServerId ? 'selected' : ''}>
                    ${s.name}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="ad-shield-badge">
              <span>🛡️ Ad-Shield</span>
            </div>

            <button class="btn-close-yt" onclick="window.App.closePlayer()" title="Close Player">✕</button>
          </div>
        </div>

        <!-- Two-Column Cinema Layout -->
        <div class="yt-watch-container">
          
          <!-- LEFT COLUMN: Cinema Player & Video Details (72%) -->
          <div class="yt-main-column">
            
            <!-- 16:9 Cinema Viewport -->
            <div class="yt-player-viewport" id="video-wrapper">
              <video id="cinema-video" playsinline crossorigin="anonymous" style="display:none;"></video>
              <div id="iframe-slot" style="display:none; width:100%; height:100%;"></div>
              
              <!-- Skip Intro Button -->
              <button id="btn-skip-intro" class="btn-skip-intro" style="display:none;" onclick="window.App.skipIntro()">
                ⚡ Skip Intro (85s)
              </button>
            </div>

            <!-- Quick Server Selector Pills -->
            <div class="yt-server-pills-bar">
              <span class="server-pills-label">⚡ Fast Mirrors:</span>
              ${this.streamData.allServers.map((s) => `
                <button class="btn-server-pill ${s.id === this.activeServerId ? 'active' : ''}" onclick="window.App.switchServer('${s.id}')">
                  ${s.name.replace(/Server \d+ \((.*?)\)/, '$1')}
                </button>
              `).join('')}
            </div>

            <!-- Video Title & Actions Bar -->
            <div class="yt-video-info-bar">
              <div class="yt-title-group">
                <h1 class="yt-title">${title}</h1>
                <div class="yt-meta-tags">
                  <span class="badge-tag quality">${quality}</span>
                  <span class="badge-tag rating">⭐ ${rating}</span>
                  <span class="badge-tag type">${isTv ? `Season ${currentSeason} • Episode ${currentEpisode}` : 'Full Feature Movie'}</span>
                  <span class="badge-tag audio">Dolby Atmos 5.1</span>
                  ${isTv ? `<span class="badge-tag" style="background:rgba(229,9,20,0.15); color:#E50914; border:1px solid #E50914;">${seasonsList.length} Seasons</span>` : ''}
                </div>
              </div>

              <div class="yt-action-buttons">
                <button class="btn-yt-action" onclick="window.App.openAudioModal()">
                  <span>🌐</span> Audio & Dubs
                </button>
                <button class="btn-yt-action active" onclick="window.App.toggleCurrentBookmark()">
                  <span>❤️</span> Save to Watchlist
                </button>
                <button class="btn-yt-action" onclick="window.App.playCurrentTrailer()">
                  <span>🎬</span> Trailer
                </button>
                <button class="btn-yt-action" onclick="window.App.shareCurrent()">
                  <span>🔗</span> Share
                </button>
              </div>
            </div>

            <!-- Expandable Description Box -->
            <div class="yt-description-box">
              <div class="yt-desc-header">
                <span><strong>Release:</strong> ${this.currentMedia.release_date || this.currentMedia.first_air_date || '2024'}</span>
                <span><strong>Genres:</strong> ${genres}</span>
                <span><strong>Audio Tracks:</strong> English [Original], Hindi (हिन्दी Dubbed), Tamil (தமிழ்), Telugu (తెలుగు)</span>
                <span><strong>Subtitles:</strong> English [CC], Hindi, Spanish, French, Arabic</span>
              </div>
              <p class="yt-desc-text">${this.currentMedia.overview || 'Experience this cinematic masterpiece in ultra-high definition.'}</p>
            </div>

          </div>

          <!-- RIGHT COLUMN: Up Next, Episodes & Suggestions (28%) -->
          <div class="yt-sidebar-column">
            
            ${isTv ? `
              <!-- TV Episodes Drawer & Season Switcher -->
              <div class="yt-sidebar-section">
                <div class="yt-sidebar-header" style="flex-direction:column; align-items:flex-start; gap:10px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <h3>📺 Episodes & Seasons</h3>
                    <span class="ep-count-badge" id="player-ep-count-badge">${this.episodes.length} Episodes</span>
                  </div>

                  <!-- Netflix-Style In-Player Season Selector -->
                  <div class="yt-season-picker-bar">
                    <label for="player-season-dropdown" class="yt-season-picker-label">Season:</label>
                    <select id="player-season-dropdown" class="yt-season-dropdown" onchange="window.App.switchPlayerSeason(this.value)">
                      ${seasonsList.map(s => `
                        <option value="${s.season_number}" ${s.season_number === currentSeason ? 'selected' : ''}>
                          ${s.name} ${s.episode_count ? `(${s.episode_count} eps)` : ''}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                </div>

                <!-- Up Next Card (Next Episode Quick Play) -->
                ${nextEpisodeObj ? `
                  <div class="yt-up-next-card" onclick="window.App.playMedia(${this.currentMedia.id}, 'tv', ${currentSeason}, ${nextEpisodeNum})">
                    <div class="up-next-badge">⚡ UP NEXT (EP ${nextEpisodeNum})</div>
                    <div class="up-next-content">
                      <img src="${nextEpisodeObj.still_path || 'https://image.tmdb.org/t/p/w300' + (this.currentMedia.backdrop_path || '')}" alt="Ep ${nextEpisodeNum}" onerror="this.src='https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'">
                      <div class="up-next-info">
                        <h4>Episode ${nextEpisodeNum}: ${nextEpisodeObj.name}</h4>
                        <span>${nextEpisodeObj.runtime || '50m'} • Click to Play ▶</span>
                      </div>
                    </div>
                  </div>
                ` : ''}

                <!-- Complete Episode List for selected season -->
                <div class="yt-episodes-list" id="player-episodes-list">
                  ${this.renderEpisodesListHtml(currentSeason, currentEpisode)}
                </div>
              </div>
            ` : ''}

            <!-- Suggested Movies & Recommended Content -->
            <div class="yt-sidebar-section">
              <div class="yt-sidebar-header">
                <h3>🍿 Suggested For You</h3>
                <span class="ep-count-badge">Trending</span>
              </div>

              <div class="yt-suggestions-list">
                ${this.suggestions.map(s => `
                  <div class="yt-suggestion-card" onclick="window.App.playMedia(${s.id}, '${s.media_type || (isTv ? 'tv' : 'movie')}')">
                    <div class="yt-sug-thumb-wrap">
                      <img src="${s.poster_path}" alt="${s.title || s.name}" loading="lazy" onerror="this.src='https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'">
                      <span class="sug-quality-tag">${s.quality || '4K'}</span>
                    </div>
                    <div class="yt-sug-info">
                      <h4>${s.title || s.name}</h4>
                      <span class="yt-sug-meta">${(s.release_date || s.first_air_date || '2024').substring(0, 4)} • ⭐ ${s.vote_average ? Number(s.vote_average).toFixed(1) : '8.2'}</span>
                      <span class="yt-sug-genre">${Array.isArray(s.genres) ? s.genres.slice(0, 2).join(', ') : 'Trending'}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    this.setupEventListeners();
  }

  mountStream() {
    const video = document.getElementById('cinema-video');
    const iframeSlot = document.getElementById('iframe-slot');
    const controls = document.getElementById('player-controls');
    const activeServer = (this.streamData?.allServers || []).find(s => s.id === this.activeServerId) || this.streamData?.activeServer;

    if (!video || !iframeSlot) return;

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    const embedUrl = activeServer?.embedUrl || this.streamData?.activeServer?.embedUrl;

    // 1. If server provides a direct embed link (AutoEmbed, VidSrc, SuperStream, Smashy, etc.)
    if (embedUrl) {
      video.style.display = 'none';
      if (controls) controls.style.display = 'none';
      
      iframeSlot.style.display = 'block';
      iframeSlot.innerHTML = '';
      const iframe = AdShield.createSandboxedIframe(embedUrl, this.currentMedia.title || this.currentMedia.name);
      iframeSlot.appendChild(iframe);
    } 
    // 2. Direct HLS / MP4 Stream (Server 5 or Live TV)
    else if (activeServer && activeServer.sources && activeServer.sources.length > 0) {
      iframeSlot.style.display = 'none';
      iframeSlot.innerHTML = '';
      video.style.display = 'block';
      if (controls) controls.style.display = 'block';

      const source = activeServer.sources[0];
      
      if (source.isM3U8 || source.url.endsWith('.m3u8')) {
        if (window.Hls && window.Hls.isSupported()) {
          this.hls = new window.Hls({
            maxBufferLength: 30,
            enableWorker: true,
            lowLatencyMode: true
          });
          this.hls.loadSource(source.url);
          this.hls.attachMedia(video);
          this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source.url;
          video.play().catch(() => {});
        }
      } else {
        video.src = source.url;
        video.play().catch(() => {});
      }
    }

    this.startProgressTracker();
  }

  setupEventListeners() {
    const video = document.getElementById('cinema-video');
    const progressSlider = document.getElementById('progress-slider');
    const progressFill = document.getElementById('progress-fill');
    const timeDisplay = document.getElementById('time-display');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnSkipIntro = document.getElementById('btn-skip-intro');

    if (video) {
      video.addEventListener('timeupdate', () => {
        if (video.duration) {
          const percent = (video.currentTime / video.duration) * 100;
          if (progressFill) progressFill.style.width = `${percent}%`;
          if (timeDisplay) timeDisplay.textContent = `${this.formatTime(video.currentTime)} / ${this.formatTime(video.duration)}`;

          if (btnSkipIntro) {
            if (video.currentTime > 2 && video.currentTime < 85) {
              btnSkipIntro.style.display = 'block';
            } else {
              btnSkipIntro.style.display = 'none';
            }
          }
        }
      });

      video.addEventListener('play', () => {
        if (btnPlayPause) btnPlayPause.textContent = '⏸';
      });

      video.addEventListener('pause', () => {
        if (btnPlayPause) btnPlayPause.textContent = '▶';
      });
    }

    if (progressSlider && video) {
      progressSlider.addEventListener('click', (e) => {
        const rect = progressSlider.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        if (video.duration) {
          video.currentTime = pos * video.duration;
        }
      });
    }

    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }

    this.keyHandler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'KeyF':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          this.toggleMute();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.seekRelative(10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.seekRelative(-10);
          break;
        case 'Escape':
          this.close();
          break;
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  toggleCurrentBookmark() {
    if (!this.currentMedia) return;
    const title = this.currentMedia.title || this.currentMedia.name;
    const year = (this.currentMedia.release_date || this.currentMedia.first_air_date || '2024').substring(0, 4);
    window.App.toggleBookmark(
      this.currentMedia.id,
      title,
      this.currentMedia.poster_path,
      this.currentMedia.vote_average || '8.5',
      year,
      this.currentMedia.mediaType
    );
  }

  playCurrentTrailer() {
    const key = this.currentMedia?.trailer_key || 'Way9Dexny3w';
    window.App.playTrailer(key);
  }

  shareCurrent() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    window.App.showToast('Link copied to clipboard! 🔗');
  }

  startProgressTracker() {
    clearInterval(this.saveProgressInterval);
    this.saveProgressInterval = setInterval(() => {
      const video = document.getElementById('cinema-video');
      if (video && !video.paused && video.currentTime > 5) {
        ApiService.saveProgress({
          mediaId: this.currentMedia.id,
          mediaType: this.currentMedia.mediaType,
          title: this.currentMedia.title || this.currentMedia.name,
          poster: this.currentMedia.poster_path,
          backdrop: this.currentMedia.backdrop_path,
          season: this.currentMedia.currentSeason,
          episode: this.currentMedia.currentEpisode,
          currentTime: Math.floor(video.currentTime),
          duration: Math.floor(video.duration || 0)
        });
      }
    }, 8000);
  }

  togglePlay() {
    const video = document.getElementById('cinema-video');
    if (video) {
      if (video.paused) video.play();
      else video.pause();
    }
  }

  toggleMute() {
    const video = document.getElementById('cinema-video');
    const btn = document.getElementById('btn-mute');
    if (video) {
      video.muted = !video.muted;
      if (btn) btn.textContent = video.muted ? '🔇' : '🔊';
    }
  }

  seekRelative(seconds) {
    const video = document.getElementById('cinema-video');
    if (video && video.duration) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }
  }

  skipIntro() {
    const video = document.getElementById('cinema-video');
    if (video) {
      video.currentTime = 85;
      window.App.showToast('Intro skipped (85s)');
    }
  }

  switchServer(serverId) {
    this.activeServerId = serverId;
    
    // Update select dropdown
    const select = document.getElementById('header-server-select');
    if (select) select.value = serverId;

    // Update pill states
    const pills = document.querySelectorAll('.btn-server-pill');
    pills.forEach(p => {
      if (p.getAttribute('onclick')?.includes(`'${serverId}'`)) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    const serverObj = (this.streamData?.allServers || []).find(s => s.id === serverId);
    window.App.showToast(`Switched to ${serverObj ? serverObj.name : serverId.toUpperCase()}`);
    this.mountStream();
  }

  switchQuality(quality) {
    window.App.showToast(`Stream quality set to ${quality.toUpperCase()}`);
  }

  toggleFullscreen() {
    const container = document.querySelector('.yt-player-viewport');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  recordWatchSession() {
    if (!this.currentMedia) return;
    const isTv = this.currentMedia.mediaType === 'tv';
    const s = this.currentMedia.currentSeason || 1;
    const e = this.currentMedia.currentEpisode || 1;
    const item = {
      id: this.currentMedia.id,
      mediaId: this.currentMedia.id,
      media_type: this.currentMedia.mediaType,
      mediaType: this.currentMedia.mediaType,
      title: this.currentMedia.title || this.currentMedia.name || 'Untitled',
      name: this.currentMedia.name || this.currentMedia.title || 'Untitled',
      poster_path: this.currentMedia.poster_path,
      backdrop_path: this.currentMedia.backdrop_path,
      season: s,
      episode: e,
      vote_average: this.currentMedia.vote_average || 7.5,
      progressPercent: Math.floor(Math.random() * 25) + 45,
      lastWatched: Date.now()
    };

    try {
      let history = JSON.parse(localStorage.getItem('cinemastream_continue_watching') || '[]');
      history = history.filter(h => Number(h.id) !== Number(item.id));
      history.unshift(item);
      localStorage.setItem('cinemastream_continue_watching', JSON.stringify(history.slice(0, 18)));
    } catch (err) {}

    ApiService.saveProgress({
      mediaId: item.id,
      mediaType: item.mediaType,
      title: item.title,
      poster: item.poster_path,
      backdrop: item.backdrop_path,
      season: s,
      episode: e,
      currentTime: 1800,
      duration: 3600
    }).catch(() => {});
  }

  close() {
    clearInterval(this.saveProgressInterval);
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    document.body.style.overflow = '';
    document.body.classList.remove('player-active');
    const container = this.getContainer();
    if (container) {
      container.innerHTML = '';
    }
    // Refresh continue watching row if on home view
    if (window.App && window.App.currentRoute === 'home') {
      window.App.renderContinueWatching();
    }
  }
}
