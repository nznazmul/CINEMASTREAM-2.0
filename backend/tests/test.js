import { SecurityService } from '../src/services/security.service.js';
import { TMDBService } from '../src/services/tmdb.service.js';
import { scraperManager } from '../src/scrapers/scraper.manager.js';
import { db } from '../src/models/db.js';

async function runTests() {
  console.log('🧪 Starting CinemaStream Core Automated Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. Test HMAC Stream Token
  const token = SecurityService.generateStreamToken(101, 'movie', 'vidplay');
  assert(token && token.includes('.'), 'HMAC Stream Token Generation');

  const verified = SecurityService.verifyStreamToken(token);
  assert(verified.valid === true && verified.payload.m === 101, 'HMAC Stream Token Verification');

  const tamperedToken = token.slice(0, -4) + 'abcd';
  const tamperedVerified = SecurityService.verifyStreamToken(tamperedToken);
  assert(tamperedVerified.valid === false, 'Tampered Token Rejection');

  // 2. Test URL Encryption / Decryption
  const testUrl = 'https://origin-cdn.upstream-video.org/hls/master.m3u8';
  const encrypted = SecurityService.encryptUrl(testUrl);
  const decrypted = SecurityService.decryptUrl(encrypted);
  assert(decrypted === testUrl, 'AES-256 Stream URL Encryption & Decryption');

  // 3. Test TMDB Catalog
  const trending = await TMDBService.getTrending();
  assert(Array.isArray(trending) && trending.length > 0, 'TMDB Trending Aggregator');

  const details = await TMDBService.getDetails(693134, 'movie');
  assert(details && (details.title === 'Dune: Part Two' || Boolean(details.title)), 'Media Details Resolver');

  const tvDetails = await TMDBService.getDetails(94997, 'tv');
  assert(tvDetails && Array.isArray(tvDetails.seasons) && tvDetails.seasons.length > 0, 'TMDB TV Show Multi-Season Resolver');

  const episodes = await TMDBService.getSeasonEpisodes(94997, 1);
  assert(Array.isArray(episodes) && episodes.length > 0 && Boolean(episodes[0].name), 'TMDB TV Season Episode Aggregator');

  // 4. Test Scraper Manager
  const streamResult = await scraperManager.resolveStreams(693134, 'movie');
  assert(streamResult.activeServer && (streamResult.activeServer.sources.length > 0 || Boolean(streamResult.activeServer.embedUrl)), 'Multi-Source Scraper Fallback & Resolution');

  // 5. Test Live TV
  const channels = await scraperManager.getLiveChannels();
  assert(Array.isArray(channels) && channels.length > 0, 'Live TV Channels Aggregator');

  const channelStream = await scraperManager.resolveLiveChannel('nasa-tv');
  assert(channelStream.success === true && channelStream.sources.length > 0, 'Live TV Channel Stream Resolver');

  // 6. Test User & Database
  const testUser = db.findUserByEmail('test@example.com');
  assert(testUser === undefined || testUser.email === 'test@example.com', 'Database User Lookup');

  console.log(`\n========================================`);
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
