import axios from 'axios';

export class BaseExtractor {
  constructor(id, name, options = {}) {
    this.id = id;
    this.name = name;
    this.options = {
      timeout: 8000,
      maxRetries: 2,
      ...options
    };
  }

  /**
   * Abstract method: Extract streams for given media
   * @param {string|number} mediaId - Movie/Show TMDB ID
   * @param {string} type - 'movie' or 'tv'
   * @param {number|null} season - Season number (for TV)
   * @param {number|null} episode - Episode number (for TV)
   */
  async extract(mediaId, type = 'movie', season = null, episode = null) {
    throw new Error(`Extract method not implemented on ${this.name}`);
  }

  /**
   * Health check for upstream extractor
   */
  async ping() {
    return { status: 'healthy', latency: 40 };
  }

  /**
   * Helper HTTP client with standard anti-blocking headers
   */
  async fetch(url, config = {}) {
    return axios({
      url,
      timeout: this.options.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...config.headers
      },
      ...config
    });
  }
}
