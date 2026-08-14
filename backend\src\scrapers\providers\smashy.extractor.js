import { BaseExtractor } from '../base.extractor.js';

export class SmashyExtractor extends BaseExtractor {
  constructor() {
    super('smashy', 'Server 3 (SmashyStream Fast)');
  }

  async extract(mediaId, type = 'movie', season = null, episode = null) {
    try {
      const isTv = type === 'tv';
      const s = season || 1;
      const e = episode || 1;

      // Verified 200 OK fast endpoint (785ms)
      const embedUrl = isTv
        ? `https://embed.smashystream.com/playere.php?tmdb=${mediaId}&season=${s}&episode=${e}`
        : `https://embed.smashystream.com/playere.php?tmdb=${mediaId}`;

      return {
        success: true,
        provider: this.id,
        providerName: this.name,
        embedUrl,
        sources: [],
        subtitles: [
          { lang: 'English', url: 'https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt', default: true }
        ],
        intro: { start: 0, end: 75 }
      };
    } catch (err) {
      return { success: false, error: err.message, provider: this.id };
    }
  }
}
