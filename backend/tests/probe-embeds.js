import axios from 'axios';

async function probeEmbeds() {
  console.log('🔍 Probing External Video Embed Providers for Dune 2 (693134) and Cyberpunk (105248)...\n');

  const targets = [
    { name: 'VidSrc.cc (Movie)', url: 'https://vidsrc.cc/v2/embed/movie/693134' },
    { name: 'VidSrc.cc (TV)', url: 'https://vidsrc.cc/v2/embed/tv/105248/1/1' },
    { name: 'AutoEmbed.cc (Movie)', url: 'https://player.autoembed.cc/embed/movie/693134' },
    { name: 'AutoEmbed.cc (TV)', url: 'https://player.autoembed.cc/embed/tv/105248/1/1' },
    { name: 'MultiEmbed (Movie)', url: 'https://multiembed.mov/?video_id=693134&tmdb=1' },
    { name: 'MultiEmbed (TV)', url: 'https://multiembed.mov/?video_id=105248&tmdb=1&s=1&e=1' },
    { name: '2Embed (Movie)', url: 'https://www.2embed.cc/embed/693134' },
    { name: '2Embed (TV)', url: 'https://www.2embed.cc/embedtv/105248&s=1&e=1' },
    { name: 'SmashyStream (Movie)', url: 'https://player.smashy.stream/movie/693134' },
    { name: 'SmashyStream (TV)', url: 'https://player.smashy.stream/tv/105248?s=1&e=1' }
  ];

  for (const t of targets) {
    const startTime = Date.now();
    try {
      const res = await axios.get(t.url, {
        timeout: 6000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      const latency = Date.now() - startTime;
      console.log(`  ✅ [ONLINE ${res.status}] ${t.name} (${latency}ms)`);
      console.log(`     ↳ URL: ${t.url}`);
    } catch (err) {
      console.log(`  ⚠️ [PROBE ERROR] ${t.name}: ${err.message}`);
    }
  }

  console.log('\nProbe complete.\n');
}

probeEmbeds();
