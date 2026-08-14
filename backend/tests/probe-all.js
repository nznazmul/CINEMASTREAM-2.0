import axios from 'axios';

const testUrls = [
  { name: 'VidSrc Me Movie', url: 'https://vidsrc.me/embed/movie?tmdb=693134' },
  { name: 'VidSrc CC Movie', url: 'https://vidsrc.cc/v2/embed/movie/693134' },
  { name: 'VidSrc Net Movie', url: 'https://vidsrc.net/embed/movie/693134' },
  { name: 'VidSrc In Movie', url: 'https://vidsrc.in/embed/movie?tmdb=693134' },
  { name: 'VidSrc PM Movie', url: 'https://vidsrc.pm/embed/movie?tmdb=693134' },
  { name: '2Embed CC Movie', url: 'https://www.2embed.cc/embed/693134' },
  { name: '2Embed Skin Movie', url: 'https://www.2embed.skin/embed/693134' },
  { name: 'AutoEmbed Movie', url: 'https://autoembed.co/movie/tmdb/693134' },
  { name: 'SmashyStream Movie', url: 'https://embed.smashystream.com/playere.php?tmdb=693134' },
  { name: 'MultiEmbed Movie', url: 'https://multiembed.mov/?video_id=693134&tmdb=1' },
  { name: 'MoviesAPI Club', url: 'https://moviesapi.club/movie/693134' },
  { name: 'SuperEmbed Stream', url: 'https://multiembed.mov/directstream.php?video_id=693134&tmdb=1' },
  { name: 'Noverse Stream', url: 'https://play.noverse.top/embed/movie/693134' },
  { name: 'Rive Stream', url: 'https://rive.stream/embed/movie?id=693134' },
  { name: 'Native Mux HLS Direct', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
];

async function probeAll() {
  console.log('--- Probing All Embed Providers ---');
  for (const t of testUrls) {
    try {
      const start = Date.now();
      const res = await axios.get(t.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://google.com'
        }
      });
      const ms = Date.now() - start;
      const xfo = res.headers['x-frame-options'] || 'NONE';
      const csp = res.headers['content-security-policy'] || 'NONE';
      const hasFrameBlock = (xfo !== 'NONE' && xfo !== 'ALLOWALL') || csp.includes('frame-ancestors');
      console.log(`✅ [${res.status} OK] ${t.name} (${ms}ms) | X-Frame-Options: ${xfo} | CSP Frame Block: ${hasFrameBlock}`);
    } catch (e) {
      console.log(`❌ [FAILED] ${t.name}: ${e.message}`);
    }
  }
}

probeAll();
