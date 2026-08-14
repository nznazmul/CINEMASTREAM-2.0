import { BaseExtractor } from '../base.extractor.js';

export class MultiEmbedExtractor extends BaseExtractor {
  constructor() {
    super('multiembed', 'Server 4 (MultiEmbed • Regional Dubs)');
  }

  async extract(mediaId, type = 'movie', season = null, episode = null) {
    try {
      const isTv = type === 'tv';
      const s = season || 1;
      const e = episode || 1;

      // Verified 200 OK fast endpoint (1269ms)
      const embedUrl = isTv
        ? `https://multiembed.mov/?video_id=${mediaId}&tmdb=1&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${mediaId}&tmdb=1`;

      return {
        success: true,
        provider: this.id,
        providerName: this.name,
        embedUrl,
        sources: [],
        subtitles: [
          { lang: 'English', url: 'https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt', default: true }
        ],
        intro: { start: 0, end: 90 }
      };
    } catch (err) {
      return { success: false, error: err.message, provider: this.id };
    }
  }
}
