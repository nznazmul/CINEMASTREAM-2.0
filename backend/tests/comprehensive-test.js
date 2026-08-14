import axios from 'axios';
import { SecurityService } from '../src/services/security.service.js';
import { TMDBService } from '../src/services/tmdb.service.js';
import { scraperManager } from '../src/scrapers/scraper.manager.js';
import { StreamProxyService } from '../src/services/stream-proxy.service.js';
import { db } from '../src/models/db.js';

const API_BASE = 'http://localhost:4000/api/v1';

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('🔬 CINEMASTREAM 2.0 FULL SYSTEM & CODE INTEGRITY AUDIT 🔬');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(success, title, details = '') {
    if (success) {
      console.log(`  ✅ [PASS] ${title}`);
      if (details) console.log(`     ↳ ${details}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title}`);
      if (details) console.error(`     ↳ Error: ${details}`);
      failed++;
    }
  }

  // --- 1. Security & Encryption Core ---
  console.log('--- 1. Security & Stream Protection Tests ---');
  try {
    const rawUrl = 'https://origin-upstream.cdn.net/hls/master.m3u8';
    const encrypted = SecurityService.encryptUrl(rawUrl);
    const decrypted = SecurityService.decryptUrl(encrypted);
    report(decrypted === rawUrl, 'AES-256 URL Encrypt/Decrypt', `Cipher: ${encrypted.substring(0, 30)}...`);

    const streamToken = SecurityService.generateStreamToken(693134, 'movie', 'vidplay');
    const verifiedToken = SecurityService.verifyStreamToken(streamToken);
    report(verifiedToken.valid && verifiedToken.payload.m === 693134, 'HMAC-SHA256 Token Signing & Validation', `Token verified for media ID 693134`);

    const badTokenResult = SecurityService.verifyStreamToken('corrupted.token.signature');
    report(!badTokenResult.valid, 'Tampered Token Security Shield', 'Correctly rejected invalid token');
  } catch (err) {
    report(false, 'Security Core Test Failed', err.message);
  }

  // --- 2. Dynamic Scrapers & Multi-Provider Matrix ---
  console.log('\n--- 2. Dynamic Scraper & Fallback Matrix ---');
  try {
    const streamRes = await scraperManager.resolveStreams(693134, 'movie');
    report(
      streamRes.allServers && streamRes.allServers.length >= 3,
      'Multi-Server Fallback Resolver',
      `Resolved ${streamRes.allServers.length} fallback servers (VidPlay, SuperStream, SmashyStream)`
    );

    const active = streamRes.activeServer;
    report(
      active && (active.sources.length > 0 || active.embedUrl),
      'Stream Source Payload',
      `Active server: ${active.name} | Sources: ${active.sources.length} | Embed: ${active.embedUrl ? 'Available' : 'None'}`
    );

    const liveChannels = await scraperManager.getLiveChannels();
    report(Array.isArray(liveChannels) && liveChannels.length >= 5, 'Live TV 24/7 Channel Aggregator', `${liveChannels.length} live channels available`);

    const nasaTv = await scraperManager.resolveLiveChannel('nasa-tv');
    report(nasaTv.success && nasaTv.sources.length > 0, 'Live IPTV Channel Resolver', `NASA TV stream URL: ${nasaTv.sources[0].url}`);
  } catch (err) {
    report(false, 'Scraper Matrix Test Failed', err.message);
  }

  // --- 3. Zero-API-Key Metadata & Discovery Engine ---
  console.log('\n--- 3. Metadata & Discovery Engine (Zero-Key Autonomous) ---');
  try {
    const trending = await TMDBService.getTrending();
    report(Array.isArray(trending) && trending.length >= 5, 'Trending Feed Aggregator', `Found ${trending.length} items`);

    const movieDetails = await TMDBService.getDetails(693134, 'movie');
    report(movieDetails && movieDetails.title === 'Dune: Part Two', 'Media Details & Cast Aggregator', `Title: ${movieDetails.title} | Cast: ${movieDetails.cast?.length || 0} actors`);

    const episodes = await TMDBService.getSeasonEpisodes(94997, 1);
    report(Array.isArray(episodes) && episodes.length >= 10, 'TV Season Episode Drawer Aggregator', `Generated ${episodes.length} episodes for season 1`);

    const searchResults = await TMDBService.search('deadpool');
    report(Array.isArray(searchResults) && searchResults.length > 0, 'Instant Search Engine', `Found ${searchResults.length} match(es) for query "deadpool"`);
  } catch (err) {
    report(false, 'Metadata Engine Test Failed', err.message);
  }

  // --- 4. Live HTTP API Endpoints ---
  console.log('\n--- 4. Live REST API Endpoints Verification ---');
  const endpoints = [
    { url: '/hero', name: 'GET /api/v1/hero' },
    { url: '/trending', name: 'GET /api/v1/trending' },
    { url: '/movies', name: 'GET /api/v1/movies' },
    { url: '/tv', name: 'GET /api/v1/tv' },
    { url: '/details/693134', name: 'GET /api/v1/details/693134' },
    { url: '/tv/94997/season/1', name: 'GET /api/v1/tv/94997/season/1' },
    { url: '/genres', name: 'GET /api/v1/genres' },
    { url: '/stream/resolve/693134', name: 'GET /api/v1/stream/resolve/693134' },
    { url: '/livetv', name: 'GET /api/v1/livetv' },
    { url: '/livetv/nasa-tv', name: 'GET /api/v1/livetv/nasa-tv' },
    { url: '/health', name: 'GET /api/v1/health' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.get(`${API_BASE}${ep.url}`, { timeout: 3000 });
      report(res.status === 200 && (res.data.success || res.data.results || res.data.data), ep.name, `HTTP 200 OK`);
    } catch (err) {
      report(false, ep.name, err.message);
    }
  }

  // --- 5. User Database, Watch History & Bookmark State ---
  console.log('\n--- 5. User Database, Watch History & Bookmark State ---');
  try {
    const guestId = `test_guest_unit_${Date.now()}`;
    
    // Save progress
    const progressRecord = db.saveProgress(guestId, {
      mediaId: 693134,
      mediaType: 'movie',
      title: 'Dune: Part Two',
      currentTime: 1200,
      duration: 9960
    });
    report(progressRecord && progressRecord.progressPercent > 0, 'Watch Progress Resume Timestamp Persistence', `Progress: ${progressRecord.progressPercent}% at ${progressRecord.currentTime}s`);

    // Toggle bookmark
    const bookmarkRes = db.toggleBookmark(guestId, {
      mediaId: 693134,
      title: 'Dune: Part Two',
      rating: 8.6,
      releaseYear: '2024'
    });
    report(bookmarkRes.bookmarked === true && bookmarkRes.count === 1, 'Watchlist Toggle & Bookmark Sync', `Watchlist count: ${bookmarkRes.count}`);

    // Auth register & login
    const testEmail = `tester_${Date.now()}@example.com`;
    const authRes = await axios.post(`${API_BASE}/auth/register`, {
      username: 'CinemaTester',
      email: testEmail,
      password: 'password123'
    });
    report(authRes.data.success && authRes.data.token, 'User JWT Registration & Authentication', `Token issued: ${authRes.data.token.substring(0, 20)}...`);
  } catch (err) {
    report(false, 'Database & Auth Test Failed', err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 FINAL AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runComprehensiveAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
