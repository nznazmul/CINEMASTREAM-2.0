import crypto from 'crypto';

export const CONFIG = {
  PORT: process.env.PORT || 4000,
  HOST: process.env.HOST || '0.0.0.0',
  JWT_SECRET: process.env.JWT_SECRET || 'cinemastream_super_secret_jwt_key_2026_x89f92!',
  STREAM_SECRET_KEY: process.env.STREAM_SECRET_KEY || 'cinemastream_stream_signing_key_994827!',
  TMDB_API_KEY: process.env.TMDB_API_KEY || '8265bd1679663a7ea12ac168da84d2e8',
  TMDB_BASE_URL: 'https://api.themoviedb.org/3',
  TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',
  STREAM_TOKEN_EXPIRY: 60 * 60 * 4, // 4 hours in seconds
  CACHE_TTL_MINUTES: 30,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 mins
  RATE_LIMIT_MAX: 300, // max requests per IP in window
  DATA_DIR: process.env.DATA_DIR || './backend/data',
  PROVIDERS: [
    { id: 'vidplay', name: 'Server 1 (Ultra HD Fast)', quality: '4K/1080p', type: 'hls', priority: 1, active: true },
    { id: 'superstream', name: 'Server 2 (Multi-Audio HD)', quality: '1080p/720p', type: 'hls', priority: 2, active: true },
    { id: 'smashy', name: 'Server 3 (Direct CDN)', quality: '1080p', type: 'hls', priority: 3, active: true },
    { id: 'streamwish', name: 'Server 4 (Backup Cloud)', quality: '720p', type: 'mp4', priority: 4, active: true }
  ]
};
