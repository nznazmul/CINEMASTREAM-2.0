import { BaseExtractor } from '../base.extractor.js';

export class SuperStreamExtractor extends BaseExtractor {
  constructor() {
    super('superstream', 'Server 2 (AutoEmbed VIP)');
  }

  async extract(mediaId, type = 'movie', season = null, episode = null) {
    try {
      const isTv = type === 'tv';
      const s = season || 1;
      const e = episode || 1;

      // AutoEmbed.cc player - Full TV, Anime & Movie multi-server player
      const embedUrl = isTv
        ? `https://player.autoembed.cc/embed/tv/${mediaId}/${s}/${e}`
        : `https://player.autoembed.cc/embed/movie/${mediaId}`;

      return {
        success: true,
        provider: this.id,
        providerName: this.name,
        embedUrl,
        sources: [],
        subtitles: [
          { lang: 'English [CC]', url: 'https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt', default: true }
        ],
        intro: { start: 0, end: 90 }
      };
    } catch (err) {
      return { success: false, error: err.message, provider: this.id };
    }
  }
}
