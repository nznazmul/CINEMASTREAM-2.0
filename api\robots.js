import { SEOService } from '../backend/src/services/seo.service.js';

export default function handler(req, res) {
  const isLocal = (req.headers.host || '').includes('localhost');
  const protocol = isLocal ? 'http' : (req.headers['x-forwarded-proto'] || 'https');
  const host = req.headers.host || 'cinemastream2.vercel.app';
  const baseUrl = `${protocol}://${host}`;
  
  const robots = SEOService.generateRobotsTxt(baseUrl);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  res.status(200).send(robots);
}
