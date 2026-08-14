import { BaseExtractor } from '../base.extractor.js';

export class AutoEmbedExtractor extends BaseExtractor {
  constructor() {
    super('autoembed', 'Server 1 (AutoEmbed • Hindi / Multi-Audio)');
  }

  async extract(mediaId, type = 'movie', season = null, episode = null) {
    try {
      const isTv = type === 'tv';
      const s = season || 1;
      const e = episode || 1;

      const embedUrl = isTv
        ? `https://autoembed.co/tv/tmdb/${mediaId}-${s}-${e}`
        : `https://autoembed.co/movie/tmdb/${mediaId}`;

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
