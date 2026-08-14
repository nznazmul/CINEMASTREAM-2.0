import { scraperManager } from '../scrapers/scraper.manager.js';
import { StreamProxyService } from '../services/stream-proxy.service.js';
import { db } from '../models/db.js';

export class StreamController {
  /**
   * Resolves streaming servers for a movie or episode
   */
  static async resolve(req, res) {
    try {
      const { id } = req.params;
      const type = req.query.type || 'movie';
      const server = req.query.server || null;
      const season = req.query.season ? parseInt(req.query.season) : null;
      const episode = req.query.episode ? parseInt(req.query.episode) : null;

      const result = await scraperManager.resolveStreams(id, type, server, season, episode);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Proxies HLS Master & Variant Playlists (.m3u8)
   */
  static async proxyManifest(req, res) {
    try {
      const { url, token } = req.query;
      if (!url || !token) {
        return res.status(400).json({ error: 'url and token are required' });
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const rewritten = await StreamProxyService.rewriteM3U8(url, baseUrl, token);
      if (!rewritten.success) {
        return res.status(502).json({ error: rewritten.error });
      }

      res.setHeader('Content-Type', rewritten.contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(rewritten.content);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Proxies video chunks / segments (.ts / .m4s)
   */
  static async proxySegment(req, res) {
    const { data } = req.query;
    if (!data) {
      return res.status(400).json({ error: 'data payload missing' });
    }

    return StreamProxyService.proxySegment(data, req.headers, res);
  }

  /**
   * Get Live TV Channels
   */
  static async getLiveChannels(req, res) {
    try {
      const channels = await scraperManager.getLiveChannels();
      res.json({ success: true, results: channels });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Resolve Live TV Channel
   */
  static async resolveLiveChannel(req, res) {
    try {
      const { id } = req.params;
      const result = await scraperManager.resolveLiveChannel(id);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get Provider Health Telemetry
   */
  static async getHealth(req, res) {
    try {
      const health = db.getHealthStats();
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        providers: health
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
