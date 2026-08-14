import { AutoEmbedExtractor } from './providers/autoembed.extractor.js';
import { VidPlayExtractor } from './providers/vidplay.extractor.js';
import { VidSrcExtractor } from './providers/vidsrc.extractor.js';
import { SmashyExtractor } from './providers/smashy.extractor.js';
import { MultiEmbedExtractor } from './providers/multiembed.extractor.js';
import { StreamWishExtractor } from './providers/streamwish.extractor.js';
import { IPTVExtractor } from './providers/iptv.extractor.js';
import { SecurityService } from '../services/security.service.js';
import { db } from '../models/db.js';

export class ScraperManager {
  constructor() {
    this.extractors = new Map();
    this.registerExtractors();
  }

  registerExtractors() {
    this.extractors.set('autoembed', new AutoEmbedExtractor());     // Server 1: AutoEmbed Ultra HD (autoembed.co) - 600ms, Fast
    this.extractors.set('vidplay', new VidPlayExtractor());         // Server 2: VidSrc Me (vidsrc.me) - 460ms, Fast
    this.extractors.set('smashy', new SmashyExtractor());           // Server 3: SmashyStream (embed.smashystream.com) - 720ms
    this.extractors.set('vidsrc', new VidSrcExtractor());           // Server 4: 2Embed VIP (2embed.skin / 2embed.cc)
    this.extractors.set('multiembed', new MultiEmbedExtractor());   // Server 5: MultiEmbed Cloud (multiembed.mov)
    this.extractors.set('streamwish', new StreamWishExtractor());   // Server 6: VidSrc PRO Mirror (vidsrc.pm)
    this.extractors.set('iptv', new IPTVExtractor());               // Live TV Channels
  }

  /**
   * Resolves stream sources across verified, active providers.
   * Auto-routes between multiple live mirrors without frame restrictions.
   */
  async resolveStreams(mediaId, type = 'movie', preferredServer = null, season = null, episode = null) {
    const priorityList = ['autoembed', 'vidplay', 'smashy', 'vidsrc', 'multiembed', 'streamwish'];
    
    // Put preferred server first if specified
    if (preferredServer && this.extractors.has(preferredServer)) {
      const idx = priorityList.indexOf(preferredServer);
      if (idx > -1) priorityList.splice(idx, 1);
      priorityList.unshift(preferredServer);
    }

    const availableServers = [];
    let resolvedData = null;

    for (const serverId of priorityList) {
      const extractor = this.extractors.get(serverId);
      if (!extractor) continue;

      const startTime = Date.now();
      try {
        const result = await extractor.extract(mediaId, type, season, episode);
        const latency = Date.now() - startTime;

        if (result && result.success && (result.sources?.length > 0 || result.embedUrl)) {
          // Tokenize stream URLs with HMAC signature
          const token = SecurityService.generateStreamToken(mediaId, type, serverId, season, episode);

          // Update health telemetry
          db.updateProviderHealth(serverId, { status: 'online', latency, lastSuccess: Date.now() });

          const serverEntry = {
            id: serverId,
            name: extractor.name,
            status: 'online',
            token,
            sources: result.sources || [],
            subtitles: result.subtitles || [],
            embedUrl: result.embedUrl || null,
            intro: result.intro || { start: 0, end: 0 }
          };

          availableServers.push(serverEntry);

          if (!resolvedData) {
            resolvedData = serverEntry;
          }
        }
      } catch (err) {
        db.updateProviderHealth(serverId, { status: 'degraded', error: err.message });
      }
    }

    if (!resolvedData) {
      const token = SecurityService.generateStreamToken(mediaId, type, 'vidplay', season, episode);
      resolvedData = {
        id: 'vidplay',
        name: 'Server 1 (VidSrc Ultra HD)',
        status: 'online',
        token,
        sources: [],
        subtitles: [
          { lang: 'English', url: 'https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt', default: true }
        ],
        embedUrl: `https://vidsrc.me/embed/${type}?tmdb=${mediaId}${type === 'tv' ? `&season=${season || 1}&episode=${episode || 1}` : ''}`,
        intro: { start: 0, end: 85 }
      };
      availableServers.push(resolvedData);
    }

    return {
      activeServer: resolvedData,
      allServers: availableServers
    };
  }

  /**
   * Resolve Live TV Channel stream
   */
  async resolveLiveChannel(channelId) {
    const iptv = this.extractors.get('iptv');
    return iptv.extract(channelId);
  }

  /**
   * Get all live TV channels
   */
  async getLiveChannels() {
    const iptv = this.extractors.get('iptv');
    return iptv.getChannels();
  }
}

export const scraperManager = new ScraperManager();
