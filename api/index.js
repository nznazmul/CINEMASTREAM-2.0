import app from '../backend/src/server.js';

export default function handler(req, res) {
  // Restore real request URL from Vercel edge rewrite headers
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-now-route-matches'];
  if (matchedPath && (matchedPath.startsWith('/api/') || matchedPath.startsWith('/v1/'))) {
    req.url = matchedPath;
  } else if (req.query && req.query.path) {
    const p = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    req.url = '/api/' + p.replace(/^\/+/, '');
  }
  return app(req, res);
}
