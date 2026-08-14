import { TMDBService } from '../services/tmdb.service.js';

export class MediaController {
  static async getHero(req, res) {
    try {
      const items = await TMDBService.getHeroMedia();
      res.json({ success: true, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getTrending(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const items = await TMDBService.getTrending(page);
      res.json({ success: true, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getMovies(req, res) {
    try {
      const category = req.query.category || 'popular';
      const genre = req.query.genre ? parseInt(req.query.genre) : null;
      const page = parseInt(req.query.page) || 1;
      const items = await TMDBService.getMovies(category, genre, page);
      res.json({ success: true, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getTVSeries(req, res) {
    try {
      const category = req.query.category || 'popular';
      const genre = req.query.genre ? parseInt(req.query.genre) : null;
      const page = parseInt(req.query.page) || 1;
      const items = await TMDBService.getTVSeries(category, genre, page);
      res.json({ success: true, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getDetails(req, res) {
    try {
      const { id } = req.params;
      const type = req.query.type || 'movie';
      const details = await TMDBService.getDetails(id, type);
      res.json({ success: true, data: details });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getSeasonEpisodes(req, res) {
    try {
      const { id, season } = req.params;
      const episodes = await TMDBService.getSeasonEpisodes(id, parseInt(season) || 1);
      res.json({ success: true, results: episodes });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async search(req, res) {
    try {
      const query = req.query.q || '';
      const page = parseInt(req.query.page) || 1;
      const results = await TMDBService.search(query, page);
      res.json({ success: true, results });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAnime(req, res) {
    try {
      const category = req.query.category || 'popular';
      const page = parseInt(req.query.page) || 1;
      const items = await TMDBService.getAnime(category, page);
      res.json({ success: true, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAnimeMovies(req, res) {
    try {
      const category = req.query.category || 'popular';
      const page = parseInt(req.query.page) || 1;
      const items = await TMDBService.getAnimeMovies(category, page);
      res.json({ success: true, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAsianDrama(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const items = await TMDBService.getAsianDrama(page);
      res.json({ success: true, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getKDramas(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const items = await TMDBService.getKDramas(page);
      res.json({ success: true, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getIndianHits(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const items = await TMDBService.getIndianHits(page);
      res.json({ success: true, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getByYear(req, res) {
    try {
      const year = parseInt(req.params.year || req.query.year) || 2024;
      const type = req.query.type || 'movie';
      const genre = req.query.genre ? parseInt(req.query.genre) : null;
      const page = parseInt(req.query.page) || 1;
      const items = await TMDBService.getByYear(year, type, genre, page);
      res.json({ success: true, year, type, results: items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getGenres(req, res) {
    const genres = TMDBService.genres || [];
    res.json({ success: true, results: genres });
  }
}
