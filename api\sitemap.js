import { SEOService } from '../backend/src/services/seo.service.js';

export default async function handler(req, res) {
  try {
    const isLocal = (req.headers.host || '').includes('localhost');
    const protocol = isLocal ? 'http' : (req.headers['x-forwarded-proto'] || 'https');
    const host = req.headers.host || 'cinemastream2.vercel.app';
    const baseUrl = `${protocol}://${host}`;
    
    const xml = await SEOService.generateSitemap(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
}
