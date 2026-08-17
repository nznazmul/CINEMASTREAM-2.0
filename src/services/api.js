// CinemaStream 2.0 - Direct TMDB API Service
// All data fetched directly from TMDB - no backend proxy needed

const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

export class ApiService {

  static getAuthToken() { return localStorage.getItem('cinemastream_token'); }
  static setAuthToken(t) {
    if (t) localStorage.setItem('cinemastream_token', t);
    else localStorage.removeItem('cinemastream_token');
  }
  static getGuestId() {
    let id = localStorage.getItem('cinemastream_guest_id');
    if (!id) {
      id = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('cinemastream_guest_id', id);
    }
    return id;
  }

  static async tmdb(path, params) {
    params = params || {};
    const url = new URL(TMDB_BASE + path);
    url.searchParams.set('api_key', TMDB_KEY);
    for (const k of Object.keys(params)) {
      if (params[k] !== null && params[k] !== undefined) url.searchParams.set(k, String(params[k]));
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('TMDB ' + res.status);
    return res.json();
  }

  static normalize(m, type) {
    const t = type || m.media_type || (m.first_air_date ? 'tv' : 'movie');
    const rawGenres = m.genres ? m.genres.map(g => (typeof g === 'object' && g ? g.name : g)) : [];
    return {
      id: m.id,
      title: m.title || m.name || 'Untitled',
      name: m.name || m.title || 'Untitled',
      overview: m.overview || '',
      poster_path: m.poster_path ? (m.poster_path.startsWith('http') ? m.poster_path : IMG_BASE + '/w500' + m.poster_path) : null,
      backdrop_path: m.backdrop_path ? (m.backdrop_path.startsWith('http') ? m.backdrop_path : IMG_BASE + '/original' + m.backdrop_path) : null,
      vote_average: m.vote_average || 7.5,
      release_date: m.release_date || m.first_air_date || '2024',
      first_air_date: m.first_air_date || m.release_date || '2024',
      media_type: t,
      genres: rawGenres,
      genre_ids: m.genre_ids || []
    };
  }

  static deduplicate(items) {
    if (!Array.isArray(items)) return [];
    const seenIds = new Set();
    const seenTitles = new Set();
    const result = [];
    
    for (const item of items) {
      if (!item || (!item.id && !item.title && !item.name)) continue;
      
      const rawId = item.id ? String(item.id) : '';
      const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
      const idKey = rawId ? `${mediaType}_${rawId}` : '';
      
      // Clean normalized title + release year signature
      const rawTitle = (item.title || item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const rawYear = String(item.release_date || item.first_air_date || '').substring(0, 4);
      const titleKey = rawTitle ? `${mediaType}_${rawTitle}_${rawYear}` : '';
      
      // Check for duplicates
      if (rawId && seenIds.has(rawId)) continue;
      if (idKey && seenIds.has(idKey)) continue;
      if (titleKey && seenTitles.has(titleKey)) continue;
      
      if (rawId) seenIds.add(rawId);
      if (idKey) seenIds.add(idKey);
      if (titleKey) seenTitles.add(titleKey);
      
      result.push(item);
    }
    return result;
  }

  static async getTrailerKey(id, type) {
    if (!id) return null;
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    try {
      const data = await this.tmdb(`/${mediaType}/${id}/videos`);
      const vids = data.results || [];
      const ytTrailers = vids.filter(v => v.site === 'YouTube');
      const trailer = ytTrailers.find(v => v.type === 'Trailer' && v.official)
        || ytTrailers.find(v => v.type === 'Trailer')
        || ytTrailers.find(v => v.type === 'Teaser')
        || ytTrailers.find(v => v.type === 'Clip')
        || ytTrailers[0];
      return trailer ? trailer.key : null;
    } catch (e) {
      return null;
    }
  }

  static async getHero() {
    try {
      const [nowPlaying, upcoming, trendingDay, onAir, anime, discover] = await Promise.all([
        this.getMovies('now_playing', null, 1).catch(() => ({ results: [] })),
        this.getMovies('upcoming', null, 1).catch(() => ({ results: [] })),
        this.getTrending(1).catch(() => ({ results: [] })),
        this.getTVSeries('on_the_air', null, 1).catch(() => ({ results: [] })),
        this.getAnime('popular', 1).catch(() => ({ results: [] })),
        this.tmdb('/discover/movie', { sort_by: 'primary_release_date.desc', 'vote_count.gte': 5, with_original_language: 'en' }).catch(() => ({ results: [] }))
      ]);

      const rawCandidates = [
        ...(discover.results || []).map(m => this.normalize(m, 'movie')),
        ...(nowPlaying.results || []).map(m => this.normalize(m, 'movie')),
        ...(upcoming.results || []).map(m => this.normalize(m, 'movie')),
        ...(trendingDay.results || []).map(m => this.normalize(m)),
        ...(onAir.results || []).map(m => this.normalize(m, 'tv')),
        ...(anime.results || []).map(m => this.normalize(m, 'tv'))
      ];

      // Filter for premium hero quality (must have backdrop, title, and rich synopsis)
      const valid = rawCandidates.filter(item => 
        item &&
        item.backdrop_path && 
        (item.title || item.name) && 
        item.overview &&
        item.overview.trim().length > 20
      );

      const deduplicated = this.deduplicate(valid);

      // Dynamic Freshness Sorter:
      // Sort so that the newest released / premiered titles are strictly at the top of the slider
      deduplicated.sort((a, b) => {
        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
        return dateB - dateA;
      });

      const topHeroItems = deduplicated.slice(0, 8);

      // Fetch and preload trailer keys for top hero slider rotation
      const itemsWithTrailers = await Promise.all(topHeroItems.map(async (item, idx) => {
        if (idx < 6 && !item.trailer_key) {
          try {
            item.trailer_key = await this.getTrailerKey(item.id, item.media_type || (item.first_air_date ? 'tv' : 'movie'));
          } catch(e) {
            item.trailer_key = null;
          }
        }
        return item;
      }));

      return { success: true, results: itemsWithTrailers };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getTrending(page) {
    page = page || 1;
    try {
      const data = await this.tmdb('/trending/all/week', { page: page });
      return { success: true, results: this.deduplicate((data.results || []).map(m => this.normalize(m))) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getMovies(category, genre, page) {
    category = category || 'popular'; page = page || 1;
    try {
      let data;
      if (genre) {
        data = await this.tmdb('/discover/movie', { page: page, with_genres: genre, sort_by: 'popularity.desc' });
      } else if (category === 'top_rated' || category === 'now_playing' || category === 'upcoming') {
        data = await this.tmdb('/movie/' + category, { page: page });
      } else {
        data = await this.tmdb('/movie/popular', { page: page });
      }
      return { success: true, results: this.deduplicate((data.results || []).map(m => this.normalize(m, 'movie'))) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getTVSeries(category, genre, page) {
    category = category || 'popular'; page = page || 1;
    try {
      let data;
      if (genre) {
        data = await this.tmdb('/discover/tv', { page: page, with_genres: genre, sort_by: 'popularity.desc' });
      } else if (category === 'top_rated' || category === 'on_the_air' || category === 'airing_today') {
        data = await this.tmdb('/tv/' + category, { page: page });
      } else {
        data = await this.tmdb('/tv/popular', { page: page });
      }
      return { success: true, results: this.deduplicate((data.results || []).map(m => this.normalize(m, 'tv'))) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getAnime(category, page) {
    category = category || 'popular'; page = page || 1;
    try {
      const params = { page: page, with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' };
      if (category === 'top_rated') { params.sort_by = 'vote_average.desc'; params['vote_count.gte'] = 250; }
      const data = await this.tmdb('/discover/tv', params);
      return { success: true, results: this.deduplicate((data.results || []).map(m => this.normalize(m, 'tv'))) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getAnimeMovies(category, page, genre) {
    category = category || 'popular'; page = page || 1;
    try {
      const params = { page: page, with_genres: genre ? `16,${genre}` : 16, with_original_language: 'ja', sort_by: 'popularity.desc' };
      if (category === 'top_rated') { params.sort_by = 'vote_average.desc'; params['vote_count.gte'] = 200; }
      const data = await this.tmdb('/discover/movie', params);
      return { success: true, results: this.deduplicate((data.results || []).map(m => this.normalize(m, 'movie'))) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getAsianDrama(pageOrFilter, subFilterOrPage) {
    let page = 1;
    let subFilter = 'all';
    if (typeof pageOrFilter === 'number') {
      page = pageOrFilter;
      subFilter = subFilterOrPage || 'all';
    } else if (typeof pageOrFilter === 'string') {
      subFilter = pageOrFilter;
      page = typeof subFilterOrPage === 'number' ? subFilterOrPage : 1;
    }
    try {
      let params = { page: page, sort_by: 'popularity.desc' };
      if (subFilter === 'chinese') {
        params.with_original_language = 'zh';
      } else if (subFilter === 'japanese') {
        params.with_original_language = 'ja';
      } else if (subFilter === 'romance') {
        params.with_original_language = 'ko|zh|ja';
        params.with_genres = 10749;
      } else if (subFilter === 'thriller') {
        params.with_original_language = 'ko|zh|ja';
        params.with_genres = '18,80,9648';
      } else {
        // All / kdrama
        params.with_original_language = 'ko|zh|ja|th';
      }
      const data = await this.tmdb('/discover/tv', params);
      return { success: true, results: this.deduplicate((data.results || []).map(m => this.normalize(m, 'tv'))) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getKDramas(page) {
    page = page || 1;
    try {
      const data = await this.tmdb('/discover/tv', { page: page, with_original_language: 'ko', sort_by: 'popularity.desc' });
      return { success: true, results: this.deduplicate((data.results || []).map(m => this.normalize(m, 'tv'))) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getIndianHits(page, subFilter) {
    page = page || 1;
    try {
      let data;
      if (subFilter === 'south') {
        const [te, ta] = await Promise.all([
          this.tmdb('/discover/movie', { page: page, with_original_language: 'te', sort_by: 'popularity.desc' }),
          this.tmdb('/discover/movie', { page: page, with_original_language: 'ta', sort_by: 'popularity.desc' })
        ]);
        return { success: true, results: this.deduplicate([
          ...(te.results || []).map(m => this.normalize(m, 'movie')),
          ...(ta.results || []).map(m => this.normalize(m, 'movie'))
        ]) };
      } else if (subFilter === 'bollywood' || subFilter === 'hindi') {
        data = await this.tmdb('/discover/movie', { page: page, with_original_language: 'hi', sort_by: 'popularity.desc' });
      } else {
        // All Indian Hits (Hindi + Telugu + Tamil)
        const [hi, te, ta] = await Promise.all([
          this.tmdb('/discover/movie', { page: page, with_original_language: 'hi', sort_by: 'popularity.desc' }),
          this.tmdb('/discover/movie', { page: page, with_original_language: 'te', sort_by: 'popularity.desc' }),
          this.tmdb('/discover/movie', { page: page, with_original_language: 'ta', sort_by: 'popularity.desc' })
        ]);
        return { success: true, results: this.deduplicate([
          ...(hi.results || []).map(m => this.normalize(m, 'movie')),
          ...(te.results || []).map(m => this.normalize(m, 'movie')),
          ...(ta.results || []).map(m => this.normalize(m, 'movie'))
        ]) };
      }
      return { success: true, results: this.deduplicate((data.results || []).map(m => this.normalize(m, 'movie'))) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getByYear(year, type, genre, page) {
    type = type || 'movie'; page = page || 1;
    try {
      const path = type === 'tv' ? '/discover/tv' : '/discover/movie';
      const params = { page: page, sort_by: 'popularity.desc' };
      if (type === 'tv') params.first_air_date_year = year;
      else params.primary_release_year = year;
      if (genre) params.with_genres = genre;
      const data = await this.tmdb(path, params);
      return { success: true, results: this.deduplicate((data.results || []).map(m => this.normalize(m, type))) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getDetails(id, type) {
    let actualType = type === 'tv' ? 'tv' : 'movie';
    let m = null;
    try {
      m = await this.tmdb((actualType === 'tv' ? '/tv/' : '/movie/') + id, { append_to_response: 'videos,credits,aggregate_credits,similar,external_ids' });
    } catch (e1) {
      // Crossover fallback (try alternative media type if initial failed)
      try {
        actualType = actualType === 'tv' ? 'movie' : 'tv';
        m = await this.tmdb((actualType === 'tv' ? '/tv/' : '/movie/') + id, { append_to_response: 'videos,credits,aggregate_credits,similar,external_ids' });
      } catch (e2) {
        return { success: false };
      }
    }
    if (!m) return { success: false };
    const norm = this.normalize(m, actualType);
    norm.media_type = actualType;
    
    // Support both standard credits (movies) and aggregate_credits (TV shows / Anime)
    const rawCast = (m.credits && m.credits.cast && m.credits.cast.length > 0)
      ? m.credits.cast
      : ((m.aggregate_credits && m.aggregate_credits.cast) ? m.aggregate_credits.cast : []);

    norm.cast = rawCast.slice(0, 15).map(c => {
      const charName = (c.roles && c.roles[0] && c.roles[0].character) || c.character || 'Cast';
      const profileUrl = c.profile_path ? (IMG_BASE + '/w185' + c.profile_path) : null;
      return {
        id: c.id,
        name: c.name || 'Cast Member',
        character: charName,
        profile: profileUrl,
        profile_path: c.profile_path ? (IMG_BASE + '/w185' + c.profile_path) : null,
        photo: profileUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'Actor')}&background=282828&color=ffffff&size=185&bold=true`
      };
    });
    norm.imdb_id = (m.external_ids && m.external_ids.imdb_id) || m.imdb_id || null;

    if (actualType === 'tv' && m.seasons && m.seasons.length) {
      norm.seasons = m.seasons
        .filter(s => s.season_number > 0)
        .map(s => ({
          season_number: s.season_number,
          name: s.name || `Season ${s.season_number}`,
          episode_count: s.episode_count || 0,
          poster_path: s.poster_path ? (IMG_BASE + '/w300' + s.poster_path) : norm.poster,
          air_date: s.air_date ? s.air_date.substring(0, 4) : '',
          overview: s.overview || ''
        }));
      norm.seasons_count = norm.seasons.length || m.number_of_seasons || 1;
    } else {
      norm.seasons = [];
      norm.seasons_count = 0;
    }

    norm.genres = (m.genres || []).map(g => (g && g.name) ? g.name : g);
    if (!norm.genres.length && norm.genre_ids && norm.genre_ids.length && this.genreMap) {
      norm.genres = norm.genre_ids.map(id => this.genreMap[id] || 'Featured').slice(0, 3);
    }
    if (!norm.genres.length) {
      norm.genres = actualType === 'tv' ? ['TV Series', 'Drama'] : ['Feature Film', 'Cinema'];
    }

    norm.duration = m.runtime ? (Math.floor(m.runtime / 60) + 'h ' + (m.runtime % 60) + 'm') : (m.episode_run_time && m.episode_run_time[0] ? m.episode_run_time[0] + 'm' : (actualType === 'tv' ? `${norm.seasons_count} Season${norm.seasons_count > 1 ? 's' : ''}` : '2h 15m'));
    norm.quality = (m.vote_average || 0) >= 7 ? '4K Ultra HD' : '1080p HD';
    norm.similar = this.deduplicate(((m.similar && m.similar.results) || []).map(s => this.normalize(s, actualType)));
    
    const videos = (m.videos && m.videos.results) || [];
    const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
                    videos.find(v => v.type === 'Teaser' && v.site === 'YouTube') ||
                    videos.find(v => v.site === 'YouTube') || {};
    norm.trailer_key = trailer.key || null;

    return Object.assign({ success: true, data: norm }, norm);
  }

  static async getTrailerKey(id, type = 'movie') {
    const actualType = type === 'tv' ? 'tv' : 'movie';
    try {
      const data = await this.tmdb(`/${actualType}/${id}/videos`);
      const videos = (data && data.results) || [];
      const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
                      videos.find(v => v.type === 'Teaser' && v.site === 'YouTube') ||
                      videos.find(v => v.site === 'YouTube') || {};
      return trailer.key || null;
    } catch (e) {
      return null;
    }
  }

  static async getEpisodes(tvId, season) {
    season = parseInt(season) || 1;
    try {
      const data = await this.tmdb('/tv/' + tvId + '/season/' + season);
      const eps = (data.episodes || []).map(ep => ({
        id: ep.id,
        episode_number: ep.episode_number,
        season_number: ep.season_number || season,
        name: ep.name || `Episode ${ep.episode_number}`,
        overview: ep.overview || '',
        still_path: ep.still_path ? (IMG_BASE + '/w500' + ep.still_path) : null,
        vote_average: ep.vote_average ? Number(ep.vote_average).toFixed(1) : '8.0',
        runtime: ep.runtime ? (ep.runtime >= 60 ? `${Math.floor(ep.runtime / 60)}h ${ep.runtime % 60}m` : `${ep.runtime}m`) : '50m',
        air_date: ep.air_date || ''
      }));
      return { success: true, results: eps, episodes: eps };
    } catch (e) {
      return { success: false, results: [], episodes: [] };
    }
  }

  static async getSeason(tvId, season) {
    return this.getEpisodes(tvId, season);
  }

  static async getSeasonDetails(tvId, season) {
    return this.getEpisodes(tvId, season);
  }

  static async search(query, page) {
    page = page || 1;
    try {
      const data = await this.tmdb('/search/multi', { query: query, page: page });
      return { success: true, results: this.deduplicate(
        (data.results || []).filter(r => r.media_type !== 'person').map(m => this.normalize(m))
      ) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async getGenres() {
    try {
      const [movies, tv] = await Promise.all([this.tmdb('/genre/movie/list'), this.tmdb('/genre/tv/list')]);
      const all = [...(movies.genres || []), ...(tv.genres || [])];
      const seen = new Set();
      return { success: true, results: all.filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; }) };
    } catch (e) { return { success: false, results: [] }; }
  }

  static async resolveStream(id, type, server, season, episode) {
    type = type || 'movie'; server = server || 'vidsrc';
    const isTv = type === 'tv';
    const s = season || 1;
    const ep = episode || 1;
    const embedMap = {
      vidsrc:      isTv ? 'https://vidsrc.to/embed/tv/' + id + '/' + s + '/' + ep : 'https://vidsrc.to/embed/movie/' + id,
      superstream: isTv ? 'https://multiembed.mov/?video_id=' + id + '&tmdb=1&s=' + s + '&e=' + ep : 'https://multiembed.mov/?video_id=' + id + '&tmdb=1',
      twoembed:    isTv ? 'https://www.2embed.cc/embedtv/' + id + '&s=' + s + '&e=' + ep : 'https://www.2embed.cc/embed/' + id,
      smashy:      isTv ? 'https://embed.smashystream.com/playere.php?tmdb=' + id + '&season=' + s + '&episode=' + ep : 'https://embed.smashystream.com/playere.php?tmdb=' + id,
      vidplay:     isTv ? 'https://vidsrc.me/embed/tv?tmdb=' + id + '&season=' + s + '&episode=' + ep : 'https://vidsrc.me/embed/movie?tmdb=' + id,
      autoembed:   isTv ? 'https://player.autoembed.cc/embed/tv/' + id + '/' + s + '/' + ep : 'https://player.autoembed.cc/embed/movie/' + id,
      vidsrcxyz:   isTv ? 'https://vidsrc.xyz/embed/tv?tmdb=' + id + '&season=' + s + '&episode=' + ep : 'https://vidsrc.xyz/embed/movie?tmdb=' + id,
      vidlink:     isTv ? 'https://vidlink.pro/tv/' + id + '/' + s + '/' + ep : 'https://vidlink.pro/movie/' + id,
      nontongo:    isTv ? 'https://www.NontonGo.win/embed/tv/' + id + '/' + s + '/' + ep : 'https://www.NontonGo.win/embed/movie/' + id,
      frembed:     isTv ? 'https://frembed.live/api/serie.php?id=' + id + '&sa=' + s + '&epi=' + ep : 'https://frembed.live/api/film.php?id=' + id,
      autoembedto: isTv ? 'https://autoembed.to/tv/tmdb/' + id + '-' + s + '-' + ep : 'https://autoembed.to/movie/tmdb/' + id,
      vidsrcvip:   isTv ? 'https://vidsrc.vip/embed/tv/' + id + '/' + s + '/' + ep : 'https://vidsrc.vip/embed/movie/' + id
    };
    const allServers = [
      { id: 'vidsrc',      name: 'Server 1 (VidSrc 4K Ultra)',        status: 'online', embedUrl: embedMap.vidsrc },
      { id: 'superstream', name: 'Server 2 (SuperStream Multi-Dubs)', status: 'online', embedUrl: embedMap.superstream },
      { id: 'twoembed',    name: 'Server 3 (2Embed VIP Pro)',          status: 'online', embedUrl: embedMap.twoembed },
      { id: 'smashy',      name: 'Server 4 (SmashyStream HD)',         status: 'online', embedUrl: embedMap.smashy },
      { id: 'vidplay',     name: 'Server 5 (VidSrc ME Mirror)',        status: 'online', embedUrl: embedMap.vidplay },
      { id: 'autoembed',   name: 'Server 6 (AutoEmbed CC)',            status: 'online', embedUrl: embedMap.autoembed },
      { id: 'vidsrcxyz',   name: 'Server 7 (VidSrc XYZ Global)',       status: 'online', embedUrl: embedMap.vidsrcxyz },
      { id: 'vidlink',     name: 'Server 8 (VidLink 4K Pro)',          status: 'online', embedUrl: embedMap.vidlink },
      { id: 'nontongo',    name: 'Server 9 (NontonGo FastCDN)',        status: 'online', embedUrl: embedMap.nontongo },
      { id: 'frembed',     name: 'Server 10 (Frembed Cinema)',         status: 'online', embedUrl: embedMap.frembed },
      { id: 'autoembedto', name: 'Server 11 (AutoEmbed TO Multi)',     status: 'online', embedUrl: embedMap.autoembedto },
      { id: 'vidsrcvip',   name: 'Server 12 (VidSrc VIP Server)',      status: 'online', embedUrl: embedMap.vidsrcvip }
    ];
    const activeUrl = embedMap[server] || embedMap['vidsrc'];
    return {
      success: true,
      data: {
        activeServer: {
          id: server || 'vidsrc',
          name: (allServers.find(x => x.id === server) || {}).name || 'VidSrc 4K Ultra',
          embedUrl: activeUrl,
          sources: [{ url: activeUrl, type: 'hls', quality: '1080p', isIframe: true }],
          subtitles: [
            { lang: 'English', url: '', label: 'English [CC]' },
            { lang: 'Hindi',   url: '', label: 'Hindi (Dubbed)' },
            { lang: 'Tamil',   url: '', label: 'Tamil' },
            { lang: 'Telugu',  url: '', label: 'Telugu' },
            { lang: 'Spanish', url: '', label: 'Espanol' }
          ]
        },
        allServers
      }
    };
  }

  static async getLiveChannels() { return { success: true, results: [] }; }
  static async resolveLiveChannel() { return { success: false }; }
  static async getHealth() { return { success: true, status: 'ok' }; }

  static async register(username, email, password) {
    const users = JSON.parse(localStorage.getItem('cs_users') || '[]');
    if (users.find(u => u.email === email)) return { success: false, error: 'Email already registered' };
    const user = { id: Date.now(), username, email, password };
    users.push(user);
    localStorage.setItem('cs_users', JSON.stringify(users));
    const token = btoa(JSON.stringify({ id: user.id, email, username }));
    this.setAuthToken(token);
    return { success: true, token, user: { id: user.id, username, email } };
  }

  static async login(email, password) {
    const users = JSON.parse(localStorage.getItem('cs_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { success: false, error: 'Invalid credentials' };
    const token = btoa(JSON.stringify({ id: user.id, email, username: user.username }));
    this.setAuthToken(token);
    return { success: true, token, user: { id: user.id, username: user.username, email } };
  }

  static async getMe() {
    const token = this.getAuthToken();
    if (!token) return { success: false };
    try { return { success: true, user: JSON.parse(atob(token)) }; }
    catch (e) { return { success: false }; }
  }

  static async getWatchHistory() {
    return { success: true, history: JSON.parse(localStorage.getItem('cs_history') || '[]') };
  }

  static async saveProgress(progressData) {
    const history = JSON.parse(localStorage.getItem('cs_history') || '[]');
    const idx = history.findIndex(h => h.id === progressData.id && h.type === progressData.type);
    const entry = Object.assign({}, progressData, { updatedAt: new Date().toISOString() });
    if (idx >= 0) history[idx] = entry; else history.unshift(entry);
    localStorage.setItem('cs_history', JSON.stringify(history.slice(0, 50)));
    return { success: true };
  }

  static async getBookmarks() {
    return { success: true, bookmarks: JSON.parse(localStorage.getItem('cs_bookmarks') || '[]') };
  }

  static async toggleBookmark(id, title, poster, rating, year, type) {
    const bookmarks = JSON.parse(localStorage.getItem('cs_bookmarks') || '[]');
    const idx = bookmarks.findIndex(b => b.id === id);
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
    } else {
      bookmarks.unshift({ id, title, poster, rating, year, type, addedAt: new Date().toISOString() });
    }
    localStorage.setItem('cs_bookmarks', JSON.stringify(bookmarks));
    return { success: true, action: idx >= 0 ? 'removed' : 'added' };
  }

  static async request(endpoint, options) {
    options = options || {};
    if (options.method === 'POST') return { success: false, error: 'Use direct methods' };
    if (endpoint.startsWith('/hero')) return this.getHero();
    const page = parseInt((endpoint.match(/page=(\d+)/) || [])[1]) || 1;
    if (endpoint.startsWith('/trending')) return this.getTrending(page);
    if (endpoint.startsWith('/animemovie') || endpoint.startsWith('/anime-movies')) {
      return this.getAnimeMovies((endpoint.match(/category=([^&]+)/) || [])[1] || 'popular', page);
    }
    if (endpoint.startsWith('/asian-drama') || endpoint.startsWith('/asiandrama')) return this.getAsianDrama(page);
    if (endpoint.startsWith('/anime')) return this.getAnime((endpoint.match(/category=([^&]+)/) || [])[1] || 'popular', page);
    if (endpoint.startsWith('/kdramas') || endpoint.startsWith('/kdrama')) return this.getKDramas(page);
    if (endpoint.startsWith('/indian') || endpoint.startsWith('/bollywood')) return this.getIndianHits(page);
    if (endpoint.startsWith('/movies') || endpoint.startsWith('/movie')) {
      return this.getMovies(
        (endpoint.match(/category=([^&]+)/) || [])[1] || 'popular',
        (endpoint.match(/genre=(\d+)/) || [])[1] || null,
        page
      );
    }
    if (endpoint.startsWith('/tvseries') || endpoint.startsWith('/tv')) {
      return this.getTVSeries(
        (endpoint.match(/category=([^&]+)/) || [])[1] || 'popular',
        (endpoint.match(/genre=(\d+)/) || [])[1] || null,
        page
      );
    }
    if (endpoint.startsWith('/details/')) {
      const id = (endpoint.match(/\/details\/(\d+)/) || [])[1];
      return this.getDetails(id, endpoint.includes('type=tv') ? 'tv' : 'movie');
    }
    if (endpoint.startsWith('/search')) {
      const q = (endpoint.match(/q=([^&]+)/) || [])[1] || '';
      return this.search(decodeURIComponent(q));
    }
    if (endpoint.startsWith('/stream/resolve/')) {
      const id = (endpoint.match(/\/stream\/resolve\/(\d+)/) || [])[1];
      const params = new URLSearchParams((endpoint.split('?')[1]) || '');
      return this.resolveStream(id, params.get('type') || 'movie', params.get('server'), params.get('season'), params.get('episode'));
    }
    if (endpoint.startsWith('/year/')) {
      const year = (endpoint.match(/\/year\/(\d{4})/) || [])[1] || 2024;
      const params = new URLSearchParams((endpoint.split('?')[1]) || '');
      return this.getByYear(year, params.get('type') || 'movie', params.get('genre'), parseInt(params.get('page')) || 1);
    }
    if (endpoint.startsWith('/genres')) return this.getGenres();
    return { success: false, results: [] };
  }

  static async fallbackTMDB(endpoint) { return this.request(endpoint); }
}

if (typeof window !== 'undefined') {
  window.ApiService = ApiService;
}
