import { SecurityService } from '../services/security.service.js';
import { CONFIG } from '../config/constants.js';

// Simple sliding window rate limiter
const rateLimitMap = new Map();

export const rateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + CONFIG.RATE_LIMIT_WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + CONFIG.RATE_LIMIT_WINDOW_MS;
  } else {
    record.count++;
  }

  rateLimitMap.set(ip, record);

  if (record.count > CONFIG.RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many requests. Please slow down and try again shortly.',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  next();
};

/**
 * Validates Auth JWT for user-specific endpoints
 */
export const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  const verified = SecurityService.verifyAuthToken(token);

  if (!verified.valid) {
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }

  req.user = verified.decoded;
  next();
};

/**
 * Optional user authentication (doesn't fail if guest)
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const verified = SecurityService.verifyAuthToken(token);
    if (verified.valid) {
      req.user = verified.decoded;
    }
  }
  next();
};

/**
 * Verifies stream HMAC tokens
 */
export const verifyStreamTokenMiddleware = (req, res, next) => {
  const token = req.query.token || req.headers['x-stream-token'];
  if (!token) {
    return res.status(403).json({ error: 'Missing security stream token' });
  }

  const result = SecurityService.verifyStreamToken(token);
  if (!result.valid) {
    return res.status(403).json({ error: 'Security token invalid or expired' });
  }

  req.streamPayload = result.payload;
  next();
};

/**
 * Ad-Shield & Security Headers Middleware
 */
export const adShieldHeaders = (req, res, next) => {
  // Allow iframes for player embeds while stripping malicious popups
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Custom header to verify server integrity
  res.setHeader('X-Powered-By', 'CinemaStream-Core-2.0');
  next();
};
