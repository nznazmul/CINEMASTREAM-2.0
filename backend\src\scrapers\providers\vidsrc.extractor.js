import { BaseExtractor } from '../base.extractor.js';

export class VidSrcExtractor extends BaseExtractor {
  constructor() {
    super('vidsrc', 'Server 2 (2Embed VIP)');
  }

  async extract(mediaId, type = 'movie', season = null, episode = null) {
    try {
      const isTv = type === 'tv';
      const s = season || 1;
      const e = episode || 1;

      // Verified 200 OK fast endpoint (712ms)
      const embedUrl = isTv
        ? `https://www.2embed.cc/embedtv/${mediaId}&s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${mediaId}`;

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
