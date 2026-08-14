import { BaseExtractor } from '../base.extractor.js';

export class StreamWishExtractor extends BaseExtractor {
  constructor() {
    super('streamwish', 'Server 6 (VidSrc PRO Mirror)');
  }

  async extract(mediaId, type = 'movie', season = null, episode = null) {
    try {
      const isTv = type === 'tv';
      const s = season || 1;
      const e = episode || 1;

      // Real 200 OK fast endpoint (vidsrc.pm mirror)
      const embedUrl = isTv
        ? `https://vidsrc.pm/embed/tv?tmdb=${mediaId}&season=${s}&episode=${e}`
        : `https://vidsrc.pm/embed/movie?tmdb=${mediaId}`;

      return {
        success: true,
        provider: this.id,
        providerName: this.name,
        embedUrl,
        sources: [],
        subtitles: [
          { lang: 'English [CC]', url: 'https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt', default: true }
        ],
        intro: { start: 0, end: 85 }
      };
    } catch (err) {
      return { success: false, error: err.message, provider: this.id };
    }
  }
}
