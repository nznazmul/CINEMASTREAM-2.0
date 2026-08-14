import axios from 'axios';
import { CONFIG } from '../config/constants.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function cached(key, fn) {
  const entry = CACHE.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return Promise.resolve(entry.data);
  return fn().then(data => { CACHE.set(key, { data, ts: Date.now() }); return data; });
}

async function tmdb(path, params = {}) {
  const res = await axios.get(TMDB_BASE + path, {
    params: { api_key: CONFIG.TMDB_API_KEY, language: 'en-US', ...params },
    timeout: 8000
  });
  return res.data;
}

function normalizeItem(m) {
  const isTV = m.media_type === 'tv' || (!m.title && m.name);
  return {
    id: m.id,
    imdb_id: m.imdb_id || null,
    title: m.title || m.name || 'Untitled',
    name: m.name || m.title || 'Untitled',
    overview: m.overview || '',
    poster_path: m.poster_path ? (IMG_BASE + '/w500' + m.poster_path) : 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop_path: m.backdrop_path ? (IMG_BASE + '/original' + m.backdrop_path) : 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg',
    release_date: m.release_date || m.first_air_date || '2024-01-01',
    first_air_date: m.first_air_date || m.release_date || '2024-01-01',
    vote_average: parseFloat((m.vote_average || 7.5).toFixed(1)),
    vote_count: m.vote_count || 0,
    media_type: m.media_type || (m.title ? 'movie' : 'tv'),
    genre_ids: m.genre_ids || [],
    genres: m.genres ? m.genres.map(g => (typeof g === 'string' ? g : g.name)) : [],
    duration: m.runtime ? (Math.floor(m.runtime / 60) + 'h ' + (m.runtime % 60) + 'm') : (m.episode_run_time && m.episode_run_time[0] ? m.episode_run_time[0] + 'm' : ''),
    quality: (m.vote_average || 0) >= 7 ? '4K Ultra HD' : '1080p HD',
    seasons_count: m.number_of_seasons || null,
    trailer_key: null
  };
}

async function fetchTrailer(id, type) {
  try {
    const data = await tmdb((type === 'tv' ? '/tv/' : '/movie/') + id + '/videos');
    const vids = (data.results || []).filter(v => v.site === 'YouTube');
    const t = vids.find(v => v.type === 'Trailer') ||
              vids.find(v => v.type === 'Teaser') ||
              vids.find(v => v.type === 'Clip') ||
              vids.find(v => v.type === 'Opening Credits') ||
              vids[0];
    return t ? t.key : null;
  } catch(e) { return null; }
}

export class TMDBService {
  static genres = [
    { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' }, { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' }, { id: 14, name: 'Fantasy' }, { id: 27, name: 'Horror' },
    { id: 9648, name: 'Mystery' }, { id: 10749, name: 'Romance' }, { id: 878, name: 'Sci-Fi' },
    { id: 53, name: 'Thriller' }, { id: 10765, name: 'Sci-Fi & Fantasy' }, { id: 10759, name: 'Action & Adventure' }
  ];

  static async getHeroMedia() {
    return cached('hero', async () => {
      const data = await tmdb('/trending/all/week');
      const items = (data.results || []).slice(0, 8);
      return Promise.all(items.map(async item => {
        const n = normalizeItem(item);
        n.trailer_key = await fetchTrailer(item.id, n.media_type);
        return n;
      }));
    });
  }

  static async getTrending(page) {
    page = page || 1;
    return cached('trending_' + page, async () => {
      const data = await tmdb('/trending/all/week', { page });
      return (data.results || []).map(normalizeItem);
    });
  }

  static async getMovies(category, genreId, page) {
    category = category || 'popular'; page = page || 1;
    return cached('movies_' + category + '_' + genreId + '_' + page, async () => {
      const paths = { popular: '/movie/popular', top_rated: '/movie/top_rated', now_playing: '/movie/now_playing', upcoming: '/movie/upcoming' };
      const params = { page };
      if (genreId) params.with_genres = genreId;
      const data = await tmdb(paths[category] || '/movie/popular', params);
      return (data.results || []).map(m => Object.assign(normalizeItem(m), { media_type: 'movie' }));
    });
  }

  static async getTVSeries(category, genreId, page) {
    category = category || 'popular'; page = page || 1;
    return cached('tv_' + category + '_' + genreId + '_' + page, async () => {
      const paths = { popular: '/tv/popular', top_rated: '/tv/top_rated', on_the_air: '/tv/on_the_air', airing_today: '/tv/airing_today' };
      const params = { page };
      if (genreId) params.with_genres = genreId;
      const data = await tmdb(paths[category] || '/tv/popular', params);
      return (data.results || []).map(m => Object.assign(normalizeItem(m), { media_type: 'tv' }));
    });
  }

  // --- ⛩️ Dedicated Anime Discovery ---
  static async getAnime(category = 'popular', page = 1) {
    return cached('anime_' + category + '_' + page, async () => {
      let params = {
        page,
        with_genres: 16,
        with_original_language: 'ja',
        sort_by: category === 'top_rated' ? 'vote_average.desc' : 'popularity.desc'
      };
      if (category === 'top_rated') {
        params['vote_count.gte'] = 250;
      }
      const data = await tmdb('/discover/tv', params);
      return (data.results || []).map(m => Object.assign(normalizeItem(m), { media_type: 'tv', quality: '1080p Ultra HD' }));
    });
  }

  // --- 🇰🇷 Trending K-Dramas ---
  static async getKDramas(page = 1) {
    return cached('kdramas_' + page, async () => {
      const data = await tmdb('/discover/tv', {
        page,
        with_original_language: 'ko',
        with_genres: 18,
        sort_by: 'popularity.desc'
      });
      return (data.results || []).map(m => Object.assign(normalizeItem(m), { media_type: 'tv' }));
    });
  }

  // --- 🇮🇳 Bollywood & Regional Blockbusters ---
  static async getIndianHits(page = 1) {
    return cached('indian_hits_' + page, async () => {
      const data = await tmdb('/discover/movie', {
        page,
        with_original_language: 'hi|ta|te',
        sort_by: 'popularity.desc'
      });
      return (data.results || []).map(m => Object.assign(normalizeItem(m), { media_type: 'movie' }));
    });
  }

  // --- 📅 2000 to 2026 Complete Catalog Discovery ---
  static async getByYear(year, type = 'movie', genreId = null, page = 1) {
    const yr = Math.min(2026, Math.max(2000, parseInt(year) || 2024));
    type = type === 'tv' ? 'tv' : 'movie';
    return cached('by_year_' + yr + '_' + type + '_' + genreId + '_' + page, async () => {
      const params = {
        page: parseInt(page) || 1,
        sort_by: 'popularity.desc'
      };
      if (type === 'movie') {
        params.primary_release_year = yr;
      } else {
        params.first_air_date_year = yr;
      }
      if (genreId) params.with_genres = genreId;
      const data = await tmdb('/discover/' + type, params);
      return (data.results || []).map(m => Object.assign(normalizeItem(m), { media_type: type }));
    });
  }

  static async search(query, page) {
    page = page || 1;
    if (!query) return [];
    return cached('search_' + query + '_' + page, async () => {
      const data = await tmdb('/search/multi', { query, page, include_adult: false });
      return (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv').map(normalizeItem);
    });
  }

  static async getDetails(id, type) {
    type = type || 'movie';
    return cached('details_' + id + '_' + type, async () => {
      const path = (type === 'tv' ? '/tv/' : '/movie/') + id;
      const data = await tmdb(path, { append_to_response: 'credits,videos,similar,external_ids' });
      const n = normalizeItem(Object.assign({}, data, { media_type: type }));
      n.imdb_id = data.imdb_id || (data.external_ids && data.external_ids.imdb_id) || null;
      const vids = ((data.videos && data.videos.results) || []).filter(v => v.site === 'YouTube');
      const t = vids.find(v => v.type === 'Trailer') ||
                vids.find(v => v.type === 'Teaser') ||
                vids.find(v => v.type === 'Clip') ||
                vids.find(v => v.type === 'Opening Credits') ||
                vids[0];
      n.trailer_key = t ? t.key : null;
      n.cast = ((data.credits && data.credits.cast) || []).slice(0, 10).map(c => ({ name: c.name, character: c.character, profile: c.profile_path ? (IMG_BASE + '/w185' + c.profile_path) : null }));
      n.similar = ((data.similar && data.similar.results) || []).slice(0, 10).map(normalizeItem);
      if (type === 'tv') {
        n.seasons_count = data.number_of_seasons || 1;
        n.seasons = (data.seasons || []).filter(s => s.season_number > 0).map(s => ({ id: s.id, season_number: s.season_number, name: s.name, episode_count: s.episode_count, poster_path: s.poster_path ? (IMG_BASE + '/w300' + s.poster_path) : n.poster_path, air_date: s.air_date }));
      }
      return n;
    });
  }

  static async getSeasonEpisodes(tvId, seasonNumber) {
    seasonNumber = seasonNumber || 1;
    return cached('eps_' + tvId + '_' + seasonNumber, async () => {
      const data = await tmdb('/tv/' + tvId + '/season/' + seasonNumber);
      return (data.episodes || []).map(ep => ({ id: ep.id, episode_number: ep.episode_number, season_number: ep.season_number, name: ep.name, overview: ep.overview, still_path: ep.still_path ? (IMG_BASE + '/original' + ep.still_path) : null, vote_average: ep.vote_average, runtime: ep.runtime ? ep.runtime + 'm' : '45m', air_date: ep.air_date }));
    });
  }

  static async getNowPlaying(page) { return this.getMovies('now_playing', null, page); }
  static async getTopRatedMovies(page) { return this.getMovies('top_rated', null, page); }
  static async getTopRatedTV(page) { return this.getTVSeries('top_rated', null, page); }
  static async getOnAirTV(page) { return this.getTVSeries('on_the_air', null, page); }
}
