import app from '../backend/src/server.js';

export default function handler(req, res) {
  if (req.query && req.query.route) {
    const sub = Array.isArray(req.query.route) ? req.query.route.join('/') : req.query.route;
    req.url = '/' + sub.replace(/^\/+/, '');
  }
  return app(req, res);
}
