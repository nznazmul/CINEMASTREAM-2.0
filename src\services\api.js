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
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      return { success: false, error: err.message };
    }
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
