const CACHE_NAME = 'cinemastream-v2.8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/index.css',
  '/styles/player.css',
  '/styles/tv.css',
  '/src/app.js',
  '/src/services/adShield.js',
  '/src/services/ublockRules.js'
];

// gorhill/uBlock Origin Comprehensive Streaming Filter Regex
const UBLOCK_EASYLIST_REGEX = /(adsterra|propellerads|popads|popcash|monetag|adnxs|exoclick|hilltopads|trafficjunky|tsyndicate|onclickmega|vlitag|clickadu|yllix|adtrue|juicyads|admaven|cpmstar|adcash|richpush|adxcore|trafficstars|clouddelivery|directrev|deloton|in-page-push|trackvoluum|stags|bidgear|zeroredirect|serving-sys|ad-score|adf\.ly|adbtc|adflex|adform|adk2x|adlane|admixer|adop|adpushup|adriver|adroll|adsafeprotected|adskeeper|adrecover|adreactor|adblade|adzerk|bidvertiser|cootlogu|creativecdn|ezoic|gumgum|media\.net|mgid|openx|outbrain|pubmatic|revcontent|rubiconproject|smartadserver|sovrn|taboola|yieldmo|zedo|bet365|1xbet|melbet|mostbet|parimatch|linebet|1win|betwinner|dafabet|stake|vulkanvegas|spinamba|slottica|doubleclick|googlesyndication|google-analytics|scorecardresearch|hotjar|clarity\.ms)\./i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. 🛡️ In-App gorhill/uBlock Network Interceptor: Return 204 No Content for ad/tracker domains
  if (UBLOCK_EASYLIST_REGEX.test(url)) {
    event.respondWith(
      new Response('', {
        status: 204,
        statusText: 'Blocked by CinemaStream uBlock Engine'
      })
    );
    return;
  }

  if (url.includes('/api/')) {
    // Network first for dynamic API calls
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// ── 🔔 Native Web Push & Lockscreen Notification Handlers ──────────────────
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { title: 'CinemaStream 4K Alert', body: event.data.text() };
    }
  }
  const title = data.title || '🎬 New 4K Release on CinemaStream!';
  const options = {
    body: data.body || 'A brand new movie or TV episode is now available to stream in 4K Ultra HD.',
    icon: 'https://image.tmdb.org/t/p/w200/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    badge: 'https://image.tmdb.org/t/p/w200/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/notifications'
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
