import axios from 'axios';

async function probeMore() {
  const targets = [
    { name: 'MultiEmbed TV (Cyberpunk)', url: 'https://multiembed.mov/?video_id=105248&tmdb=1&s=1&e=1' },
    { name: '2Embed TV (Cyberpunk)', url: 'https://www.2embed.cc/embedtv/105248&s=1&e=1' },
    { name: 'SmashyStream Embed', url: 'https://embed.smashystream.com/playere.php?tmdb=105248&season=1&episode=1' },
    { name: 'SuperEmbed Stream', url: 'https://superembed.stream/embed/tv/105248/1/1' },
    { name: 'VidSrc Me', url: 'https://vidsrc.me/embed/tv?tmdb=105248&season=1&episode=1' }
  ];

  for (const t of targets) {
    const startTime = Date.now();
    try {
      const res = await axios.get(t.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });
      console.log(`  ✅ [ONLINE ${res.status}] ${t.name} (${Date.now() - startTime}ms) -> ${t.url}`);
    } catch (err) {
      console.log(`  ⚠️ [ERROR] ${t.name}: ${err.message}`);
    }
  }
}

probeMore();
