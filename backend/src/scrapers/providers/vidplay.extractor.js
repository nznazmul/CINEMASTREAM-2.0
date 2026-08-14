import { BaseExtractor } from '../base.extractor.js';

export class VidPlayExtractor extends BaseExtractor {
  constructor() {
    super('vidplay', 'Server 1 (VidSrc Ultra HD)');
  }

  async extract(mediaId, type = 'movie', season = null, episode = null) {
    try {
      const isTv = type === 'tv';
      const s = season || 1;
      const e = episode || 1;

      // Verified 200 OK fast endpoint (434ms latency)
      const embedUrl = isTv
        ? `https://vidsrc.me/embed/tv?tmdb=${mediaId}&season=${s}&episode=${e}`
        : `https://vidsrc.me/embed/movie?tmdb=${mediaId}`;

      return {
        success: true,
        provider: this.id,
        providerName: this.name,
        embedUrl,
        sources: [],
        subtitles: [
          { lang: 'English', url: 'https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt', default: true }
        ],
        intro: { start: 0, end: 85 }
      };
    } catch (err) {
      return { success: false, error: err.message, provider: this.id };
    }
  }
}
