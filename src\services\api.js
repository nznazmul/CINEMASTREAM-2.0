// API Service for CinemaStream 2.0 Web Client

const API_BASE = '/api/v1';

export class ApiService {
  static getAuthToken() {
    return localStorage.getItem('cinemastream_token');
  }

  static setAuthToken(token) {
    if (token) {
      localStorage.setItem('cinemastream_token', token);
    } else {
      localStorage.removeItem('cinemastream_token');
    }
  }

  static getGuestId() {
    let guestId = localStorage.getItem('cinemastream_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('cinemastream_guest_id', guestId);
    }
    return guestId;
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.ok) {
        const data = await response.json();
        if (data && (data.results || data.success || data.data)) {
          return data;
        }
      }
    } catch (err) {
      console.warn(`API serverless fallback for ${endpoint}:`, err.message);
    }

    // Direct TMDB Client-Side Resilience Fallback
    return this.fallbackTMDB(endpoint);
  }

  static async fallbackTMDB(endpoint) {
    const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';
    const TMDB_BASE = 'https://api.themoviedb.org/3';
    const IMG_BASE = 'https://image.tmdb.org/t/p';

    const normalize = (m, type) => ({
      id: m.id,
      title: m.title || m.name || 'Untitled',
      name: m.name || m.title || 'Untitled',
      overview: m.overview || '',
      poster_path: m.poster_path ? `${IMG_BASE}/w500${m.poster_path}` : null,
      backdrop_path: m.backdrop_path ? `${IMG_BASE}/original${m.backdrop_path}` : null,
      vote_average: m.vote_average || 7.5,
      release_date: m.release_date || m.first_air_date || '2024',
      first_air_date: m.first_air_date || m.release_date || '2024',
      media_type: type || m.media_type || (m.first_air_date ? 'tv' : 'movie'),
      genre_ids: m.genre_ids || []
    });

    try {
      if (endpoint.startsWith('/hero')) {
        const res = await fetch(`${TMDB_BASE}/trending/all/week?api_key=${TMDB_KEY}`);
        const data = await res.json();
        return { success: true, results: (data.results || []).slice(0, 8).map(m => normalize(m)) };
      }
      if (endpoint.startsWith('/trending')) {
        const res = await fetch(`${TMDB_BASE}/trending/all/week?api_key=${TMDB_KEY}`);
        const data = await res.json();
        return { success: true, results: (data.results || []).map(m => normalize(m)) };
      }
      if (endpoint.startsWith('/movies')) {
        const res = await fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}`);
        const data = await res.json();
        return { success: true, results: (data.results || []).map(m => normalize(m, 'movie')) };
      }
      if (endpoint.startsWith('/tv')) {
        const res = await fetch(`${TMDB_BASE}/tv/popular?api_key=${TMDB_KEY}`);
        const data = await res.json();
        return { success: true, results: (data.results || []).map(m => normalize(m, 'tv')) };
      }
      if (endpoint.startsWith('/anime')) {
        const res = await fetch(`${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc`);
        const data = await res.json();
        return { success: true, results: (data.results || []).map(m => normalize(m, 'tv')) };
      }
      if (endpoint.startsWith('/kdramas')) {
        const res = await fetch(`${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&with_original_language=ko&sort_by=popularity.desc`);
        const data = await res.json();
        return { success: true, results: (data.results || []).map(m => normalize(m, 'tv')) };
      }
      if (endpoint.startsWith('/indian')) {
        const res = await fetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_original_language=hi|te|ta&sort_by=popularity.desc`);
        const data = await res.json();
        return { success: true, results: (data.results || []).map(m => normalize(m, 'movie')) };
      }
      if (endpoint.startsWith('/year/')) {
        const match = endpoint.match(/\/year\/(\d{4})/);
        const year = match ? match[1] : '2024';
        const res = await fetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&primary_release_year=${year}&sort_by=popularity.desc`);
        const data = await res.json();
        return { success: true, results: (data.results || []).map(m => normalize(m, 'movie')) };
      }
      if (endpoint.startsWith('/details/')) {
        const match = endpoint.match(/\/details\/(\d+)/);
        const id = match ? match[1] : '';
        const isTv = endpoint.includes('type=tv');
        const res = await fetch(`${TMDB_BASE}/${isTv ? 'tv' : 'movie'}/${id}?api_key=${TMDB_KEY}&append_to_response=videos,credits,similar`);
        const m = await res.json();
        return {
          success: true,
          data: {
            ...normalize(m, isTv ? 'tv' : 'movie'),
            genres: (m.genres || []).map(g => g.name),
            cast: (m.credits?.cast || []).slice(0, 10).map(c => ({ name: c.name, character: c.character })),
            trailer_key: (m.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key || null,
            seasons: m.seasons || []
          }
        };
      }
      if (endpoint.startsWith('/search')) {
        const qMatch = endpoint.match(/q=([^&]+)/);
        const q = qMatch ? decodeURIComponent(qMatch[1]) : '';
        const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`);
        const data = await res.json();
        return { success: true, results: (data.results || []).map(m => normalize(m)) };
      }
    } catch (e) {
      console.error('Direct TMDB fallback error:', e);
    }
    return { success: false, results: [] };
  }

  // --- Media & Discovery ---
  static async getHero() {
    return this.request('/hero');
  }

  static async getTrending(page = 1) {
    return this.request(`/trending?page=${page}`);
  }

  static async getMovies(category = 'popular', genre = null, page = 1) {
    return this.request(`/movies?category=${category}${genre ? `&genre=${genre}` : ''}&page=${page}`);
  }

  static async getTVSeries(category = 'popular', genre = null, page = 1) {
    return this.request(`/tv?category=${category}${genre ? `&genre=${genre}` : ''}&page=${page}`);
  }

  static async getAnime(category = 'popular', page = 1) {
    return this.request(`/anime?category=${category}&page=${page}`);
  }

  static async getKDramas(page = 1) {
    return this.request(`/kdramas?page=${page}`);
  }

  static async getIndianHits(page = 1) {
    return this.request(`/indian?page=${page}`);
  }

  static async getByYear(year, type = 'movie', genre = null, page = 1) {
    return this.request(`/year/${year}?type=${type}${genre ? `&genre=${genre}` : ''}&page=${page}`);
  }

  static async getDetails(id, type = 'movie') {
    return this.request(`/details/${id}?type=${type}`);
  }

  static async getEpisodes(tvId, season = 1) {
    return this.request(`/tv/${tvId}/season/${season}`);
  }

  static async search(query, page = 1) {
    return this.request(`/search?q=${encodeURIComponent(query)}&page=${page}`);
  }

  static async getGenres() {
    return this.request('/genres');
  }

  // --- Streaming & Live TV ---
  static async resolveStream(id, type = 'movie', server = null, season = null, episode = null) {
    let query = `type=${type}`;
    if (server) query += `&server=${server}`;
    if (season) query += `&season=${season}`;
    if (episode) query += `&episode=${episode}`;
    return this.request(`/stream/resolve/${id}?${query}`);
  }

  static async getLiveChannels() {
    return this.request('/livetv');
  }

  static async resolveLiveChannel(channelId) {
    return this.request(`/livetv/${channelId}`);
  }

  static async getHealth() {
    return this.request('/health');
  }

  // --- User State ---
  static async register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  }

  static async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  static async getMe() {
    return this.request('/auth/me');
  }

  static async getWatchHistory() {
    const guestId = this.getGuestId();
    return this.request(`/user/history?guestId=${guestId}`);
  }

  static async saveProgress(progressData) {
    const guestId = this.getGuestId();
    return this.request('/user/progress', {
      method: 'POST',
      body: JSON.stringify({ ...progressData, guestId })
    });
  }

  static async getBookmarks() {
    const guestId = this.getGuestId();
    return this.request(`/user/bookmarks?guestId=${guestId}`);
  }

  static async toggleBookmark(id, title, poster, rating, year, type) {
    const guestId = this.getGuestId();
    const media = typeof id === 'object' ? id : { id, title, poster, rating, year, type };
    return this.request('/user/bookmarks/toggle', {
      method: 'POST',
      body: JSON.stringify({ ...media, guestId })
    });
  }
}
