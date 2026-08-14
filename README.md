# 🎬 CinemaStream 2.0 — Ultimate 4K Streaming Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/API-Express%20Fastify-blue.svg)](https://expressjs.com)
[![Streaming Mirrors](https://img.shields.io/badge/Mirrors-6%20Ultra%20HD%20CDNs-red.svg)](#-multi-mirror-streaming-matrix)
[![Audio](https://img.shields.io/badge/Audio-Multi--Dub%20(Hindi%2FTamil%2FTelugu%2FEng)-orange.svg)](#-multi-audio-dubbing-matrix)
[![Catalog](https://img.shields.io/badge/Catalog-2000%20to%202026%20(700K%2B%20Titles)-purple.svg)](#-2000-to-2026-complete-catalog-universe)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

A cinema-grade, full-stack movie, TV series, and anime streaming ecosystem featuring **6 fast live streaming mirrors**, **multi-language audio dubbing**, **ambient 4K teaser autoplay**, **scroll-aware auto-pause/resume**, **automatic continue watching history**, and **complete 2000–2026 catalog discovery**.

---

## 🌟 Key Features

### 1. 🌐 6 Fast Ultra HD Streaming Mirrors
CinemaStream dynamically resolves and balances playback across 6 global CDN mirrors:
1. **Server 1 (AutoEmbed Ultra HD)**: Fast 4K/1080p playback with multi-audio dub tracks (Hindi, Tamil, Telugu, English).
2. **Server 2 (VidSrc Ultra HD)**: Low-latency original audio with multi-language subtitle tracks.
3. **Server 3 (SmashyStream)**: Fast backup cluster for new releases.
4. **Server 4 (2Embed VIP)**: High-speed European & US mirror cluster.
5. **Server 5 (MultiEmbed Cloud)**: Dedicated regional audio mirror (Bollywood & South Indian hits).
6. **Server 6 (VidSrc PRO Mirror)**: 99.9% uptime failover node.

---

### 2. 📅 2000 to 2026 Complete Catalog Universe
- Browse over **700,000+ movies, TV shows, and anime** released between **2000 and 2026**.
- Interactive glowing year chip selector (2026 down to 2000) with 1-click **🎬 Movies** vs **📺 TV Series** filters.
- Multi-page infinite scroll pagination (**"Load More Titles ↓"**).

---

### 3. ⛩️ Dedicated Anime & Asian Drama Hub
- Dedicated **⛩️ Anime** hub with weekly simulcasts (*Demon Slayer, Solo Leveling, Jujutsu Kaisen, Frieren*).
- Dedicated categories for **🇰🇷 K-Dramas** and **🇮🇳 Bollywood & Regional Blockbusters**.

---

### 4. 🔊 Ambient 4K Video Teaser Autoplay & Scroll Awareness
- **Hero & Detail Modal Teasers**: Automatically streams high-definition background trailers with ambient crossfade overlays.
- **Scroll-Aware Auto-Pause/Resume**: Automatically pauses video playback when scrolling down past the fold (> 320px) and resumes when scrolling back up (< 220px).
- **🔊 Sound Toggle**: Instant 1-click mute and unmute controls.

---

### 5. 🍿 Automatic "Continue Watching" with Progress Bars
- Automatically records timestamps and watch percentage during playback.
- Displays Netflix-style progress bars with episode indicators (e.g. `S1 : E3 • 78% watched`) and 1-click resume.

---

### 6. 📱 Full Mobile & Android TV Responsiveness
- **Netflix Mobile Bottom Navigation** (`🏠 Home`, `🎬 Movies`, `📺 TV Shows`, `⛩️ Anime`, `❤️ My List`) with iOS safe-area insets.
- **Native Bottom Sheet Modals** with smooth touch gestures.
- **D-Pad Spatial Navigation** support for Android TV / Smart TV remotes.

---

### 7. 🔍 SEO-Optimized Pages & Schema.org JSON-LD
- Built-in **FAQ**, **Privacy Policy**, **Contact Us & Content Request Desk**, and **Speed Test** diagnostic tool.
- Rich OpenGraph cards and Schema.org `WebSite` & `FAQPage` structured data for Google search indexing.

---

## 🏗️ Project Structure

```text
c:\new\
├── backend/                       # Core API Gateway, Security, Stream Proxy & Scrapers
│   ├── src/
│   │   ├── config/                # Environment variables & constants
│   │   ├── controllers/           # Media, Stream, and User controllers
│   │   ├── middleware/            # Security headers, JWT auth, Rate limiting, HMAC tokens
│   │   ├── models/                # Local database & telemetry engine
│   │   ├── routes/                # Express API routes (/api/v1/...)
│   │   ├── scrapers/              # Multi-mirror scraper extractors (AutoEmbed, VidSrc, Smashy, etc.)
│   │   ├── services/              # TMDB Metadata API & Stream Proxying
│   │   └── server.js              # Express server entrypoint
│   └── tests/                     # Automated test suites
│
├── web/                           # Cinematic Frontend Web Client
│   ├── index.html                 # Semantic SEO HTML5 with Schema.org JSON-LD
│   ├── manifest.json              # PWA Mobile & Desktop Install Manifest
│   ├── styles/                    # Dark luxury Netflix CSS & player styles
│   └── src/
│       ├── components/            # Navbar, HeroBanner, MediaGrid, VideoPlayer
│       ├── services/              # API Gateway & Ad-Shield Security
│       └── app.js                 # SPA Router & view controller
│
└── android/                       # Android Mobile & Android TV Leanback package
```

---

## 🚀 Quick Start (Running Locally)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Unified Server
```bash
npm run dev
```

Open your browser at:
👉 **`http://localhost:4000`**

## 🔒 Security Configuration & Environment Variables

You can customize runtime security settings via environment variables or `.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | HTTP port for the web platform and API |
| `JWT_SECRET` | `cinemastream_super_secret_jwt_key_2026_x89f92!` | Secret key for signing user authentication tokens |
| `STREAM_SECRET_KEY` | `cinemastream_stream_signing_key_994827!` | Secret HMAC key for stream URL encryption |
| `TMDB_API_KEY` | `4f298a53e5522830c95f789f07da4918` | TMDB API Key for live metadata & poster discovery |
| `STREAM_TOKEN_EXPIRY`| `14400` (4 hours) | Expiration time for signed stream tokens |

---

## 📱 Building the Android APK & Android TV App

See [android/README.md](file:///c:/new/android/README.md) for full Android Studio build instructions:
```bash
cd android
npm.cmd install
npx.cmd cap sync android
npx.cmd cap open android
```
Select **Build > Build APK(s)** to generate the installable Android APK.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
