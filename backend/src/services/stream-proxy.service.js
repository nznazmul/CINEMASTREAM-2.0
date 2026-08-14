import axios from 'axios';
import { SecurityService } from './security.service.js';

export class StreamProxyService {
  /**
   * Rewrites an upstream M3U8 playlist to route segment requests through our secure proxy.
   * This completely conceals the origin streaming server and prevents IP leaks/hotlinks.
   */
  static async rewriteM3U8(upstreamUrl, baseUrl, token, headers = {}) {
    try {
      const response = await axios.get(upstreamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': upstreamUrl,
          ...headers
        },
        timeout: 10000
      });

      const content = response.data;
      if (typeof content !== 'string') {
        throw new Error('Invalid M3U8 format received from upstream');
      }

      const urlObj = new URL(upstreamUrl);
      const basePath = upstreamUrl.substring(0, upstreamUrl.lastIndexOf('/') + 1);

      const lines = content.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          // Check for URI tags like #EXT-X-KEY:METHOD=AES-128,URI="..."
          if (trimmed.startsWith('#EXT-X-KEY:') && trimmed.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/, (match, uri) => {
              const fullKeyUrl = uri.startsWith('http') ? uri : new URL(uri, basePath).href;
              const encrypted = SecurityService.encryptUrl(fullKeyUrl);
              return `URI="${baseUrl}/api/v1/stream/segment?data=${encodeURIComponent(encrypted)}&token=${token}"`;
            });
          }
          return line;
        }

        // Resolving segment URL
        let segmentUrl = trimmed;
        if (!segmentUrl.startsWith('http')) {
          segmentUrl = new URL(segmentUrl, basePath).href;
        }

        // Encrypt and proxy
        const encrypted = SecurityService.encryptUrl(segmentUrl);
        return `${baseUrl}/api/v1/stream/segment?data=${encodeURIComponent(encrypted)}&token=${token}`;
      });

      return {
        success: true,
        contentType: response.headers['content-type'] || 'application/vnd.apple.mpegurl',
        content: rewrittenLines.join('\n')
      };
    } catch (err) {
      return {
        success: false,
        error: `Stream Proxy Error: ${err.message}`
      };
    }
  }

  /**
   * Proxies binary media segments (TS/M4S/MP4) from upstream CDN
   */
  static async proxySegment(encryptedData, reqHeaders, res) {
    const upstreamUrl = SecurityService.decryptUrl(encryptedData);
    if (!upstreamUrl) {
      return res.status(400).json({ error: 'Invalid or corrupted segment signature' });
    }

    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': upstreamUrl
      };

      if (reqHeaders['range']) {
        headers['Range'] = reqHeaders['range'];
      }

      const response = await axios({
        method: 'get',
        url: upstreamUrl,
        responseType: 'stream',
        headers,
        timeout: 15000
      });

      res.status(response.status);
      
      const copyHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
      copyHeaders.forEach(h => {
        if (response.headers[h]) {
          res.setHeader(h, response.headers[h]);
        }
      });

      // Prevent caching errors & ensure smooth streaming
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');

      response.data.pipe(res);
    } catch (err) {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Upstream segment fetch failed', details: err.message });
      }
    }
  }
}
