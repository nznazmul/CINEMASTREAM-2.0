import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.routes.js';
import { CONFIG } from './config/constants.js';
import { rateLimiter, adShieldHeaders } from './middleware/security.middleware.js';
import { SEOService } from './services/seo.service.js';

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

// 4. Dynamic SEO Endpoints (Sitemap & Robots.txt)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:4000';
    const baseUrl = `${protocol}://${host}`;
    const xml = await SEOService.generateSitemap(baseUrl);
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (e) {
    res.status(500).send('Error generating sitemap');
  }
});

app.get('/robots.txt', (req, res) => {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:4000';
  const robots = SEOService.generateRobotsTxt(`${protocol}://${host}`);
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

// 5. API Endpoints
app.use('/api/v1', apiRoutes);
app.use('/v1', apiRoutes);
app.use('/api', apiRoutes);

// 6. Serve Web Frontend
const webPath = path.resolve(__dirname, '../../web');
app.use(express.static(webPath));

// Fallback SPA routing for Web Client
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/v1/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(webPath, 'index.html'));
});

// 7. Start Server (Only in local/dedicated container environments when executed directly)
const isDirectEntry = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'));
if (isDirectEntry && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
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
}

export default app;
