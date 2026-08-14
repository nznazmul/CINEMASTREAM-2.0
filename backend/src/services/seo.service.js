import { TMDBService } from './tmdb.service.js';

export class SEOService {
  static async generateSitemap(baseUrl = 'http://localhost:4000') {
    const staticRoutes = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '#movies', priority: '0.9', changefreq: 'daily' },
      { path: '#tv', priority: '0.9', changefreq: 'daily' },
      { path: '#anime', priority: '0.9', changefreq: 'daily' },
      { path: '#years', priority: '0.8', changefreq: 'weekly' },
      { path: '#faq', priority: '0.7', changefreq: 'monthly' },
      { path: '#privacy', priority: '0.5', changefreq: 'monthly' },
      { path: '#terms', priority: '0.5', changefreq: 'monthly' },
      { path: '#contact', priority: '0.6', changefreq: 'monthly' },
      { path: '#speedtest', priority: '0.6', changefreq: 'monthly' }
    ];

    // Add 2000 to 2026 Yearly Archives
    const yearRoutes = [];
    for (let y = 2026; y >= 2000; y--) {
      yearRoutes.push({ path: `#years?y=${y}`, priority: '0.8', changefreq: 'weekly' });
    }

    // Fetch trending and top-rated movies/shows for rich indexing
    let mediaItems = [];
    try {
      const [trending, anime, movies] = await Promise.all([
        TMDBService.getTrending(1).catch(() => []),
        TMDBService.getAnime('popular', 1).catch(() => []),
        TMDBService.getMovies('popular', null, 1).catch(() => [])
      ]);
      mediaItems = [...trending, ...anime, ...movies].slice(0, 50);
    } catch (e) {}

    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;

    // Static & Year URLs
    for (const r of [...staticRoutes, ...yearRoutes]) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/${r.path}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${r.changefreq}</changefreq>\n`;
      xml += `    <priority>${r.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Media URLs with Google Video Sitemap tags
    for (const item of mediaItems) {
      const title = (item.title || item.name || 'Untitled').replace(/[<>&'"]/g, '');
      const desc = (item.overview || 'Watch in 4K Ultra HD on CinemaStream').replace(/[<>&'"]/g, '');
      const type = item.media_type || 'movie';
      const year = (item.release_date || item.first_air_date || '2024').substring(0, 4);
      
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/#${type}/${item.id}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.85</priority>\n`;
      xml += `    <video:video>\n`;
      xml += `      <video:thumbnail_loc>${item.backdrop_path || item.poster_path || 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'}</video:thumbnail_loc>\n`;
      xml += `      <video:title>${title} (${year}) Watch Online Free 4K</video:title>\n`;
      xml += `      <video:description>${desc}</video:description>\n`;
      xml += `      <video:player_loc>${baseUrl}/#watch?id=${item.id}&amp;type=${type}</video:player_loc>\n`;
      xml += `      <video:rating>${item.vote_average || 7.5}</video:rating>\n`;
      xml += `      <video:family_friendly>yes</video:family_friendly>\n`;
      xml += `      <video:publication_date>${item.release_date || item.first_air_date || '2024-01-01'}</video:publication_date>\n`;
      xml += `    </video:video>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;
    return xml;
  }

  static generateRobotsTxt(baseUrl = 'http://localhost:4000') {
    return `User-agent: *
Allow: /
Disallow: /api/v1/stream/
Disallow: /api/v1/user/

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
`;
  }
}
