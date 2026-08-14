import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.routes.js';
import { CONFIG } from './config/constants.js';
import { rateLimiter, adShieldHeaders } from './middleware/security.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. CORS Configuration (Allows web, local development, Android WebView & Capacitor)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Stream-Token', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length']
}));

// 2. Helmet Security Headers (Configured for Video Players & Iframes)
app.use(helmet({
  contentSecurityPolicy: false, // Permissive for external video stream CDNs & embeds
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 3. Ad-Shield and Body Parsers
app.use(adShieldHeaders);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// 4. API Endpoints
app.use('/api/v1', apiRoutes);

// 5. Serve Web Frontend
const webPath = path.resolve(__dirname, '../../web');
app.use(express.static(webPath));

// Fallback SPA routing for Web Client
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(webPath, 'index.html'));
});

// 6. Start Server
const server = app.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log('================================================================');
  console.log('🎬 CINEMASTREAM CORE PLATFORM - SECURE FULL-STACK ENGINE 🎬');
  console.log('================================================================');
  console.log(`🌐 Server running at : http://${CONFIG.HOST === '0.0.0.0' ? 'localhost' : CONFIG.HOST}:${CONFIG.PORT}`);
  console.log(`⚡ API Gateway Base  : http://localhost:${CONFIG.PORT}/api/v1`);
  console.log(`🛡️  Stream Proxy Core : ACTIVE (HMAC-SHA256 Encrypted)`);
  console.log(`🧼 Ad-Shield Sandbox : ACTIVE (Auto-blocking Malicious Scripts)`);
  console.log(`📱 Android & TV Sync : READY (ExoPlayer & Leanback Compatible)`);
  console.log('================================================================\n');
});

process.on('SIGTERM', () => {
  server.close(() => console.log('CinemaStream Server Stopped.'));
});

export default app;
