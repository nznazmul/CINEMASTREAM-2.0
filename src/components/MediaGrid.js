export class MediaGrid {
  static renderContinueWatchingRow(items) {
    if (!items || items.length === 0) return '';
    const cards = items.map((item, idx) => {
      const title = (item.title || item.name || 'Untitled').replace(/"/g, '&quot;');
      const poster = item.backdrop_path || item.poster_path || 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg';
      const isTv = item.media_type === 'tv' || item.mediaType === 'tv' || item.season;
      const progress = item.progressPercent || 50;
      const s = item.season || 1;
      const e = item.episode || 1;

      return `
        <div class="nf-cw-card" onclick="window.App.playMedia(${item.id}, '${item.media_type || item.mediaType || 'movie'}', ${s}, ${e})">
          <div class="nf-cw-img-wrap">
            <img class="nf-cw-img" src="${poster}" alt="${title}" loading="lazy" onerror="this.src='https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg'">
            <div class="nf-cw-play-overlay">
              <span class="nf-cw-play-icon">▶</span>
            </div>
            <button class="nf-cw-remove" onclick="event.stopPropagation(); window.App.removeFromContinueWatching(${item.id})" title="Remove from list">✕</button>
            <div class="nf-cw-progress-bar">
              <div class="nf-cw-progress-fill" style="width: ${progress}%;"></div>
            </div>
          </div>
          <div class="nf-cw-info">
            <div class="nf-cw-title">${title}</div>
            <div class="nf-cw-sub">${isTv ? `S${s} : E${e}` : 'Movie'} • ${progress}% watched</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="nf-row nf-cw-row" id="continue-watching-row">
        <div class="nf-row-title">
          <span>▶️ Continue Watching for You</span>
        </div>
        <div class="nf-slider-wrap">
          <button class="nf-scroll-btn left" onclick="MediaGrid.scroll('row-cw', -1)" aria-label="Scroll Left">&#8249;</button>
          <div class="nf-slider" id="row-cw">
            ${cards}
          </div>
          <button class="nf-scroll-btn right" onclick="MediaGrid.scroll('row-cw', 1)" aria-label="Scroll Right">&#8250;</button>
        </div>
      </div>
    `;
  }

  static renderRow(title, items, rowId, categoryType, categoryEndpoint) {
    if (!items || items.length === 0) return '';
    
    // Deduplicate items in row
    const seen = new Set();
    const uniqueItems = [];
    for (const item of items) {
      if (!item || !item.id) continue;
      const key = `${item.media_type || 'media'}_${item.id}`;
      if (seen.has(key) || seen.has(String(item.id))) continue;
      seen.add(key);
      seen.add(String(item.id));
      uniqueItems.push(item);
    }
    if (uniqueItems.length === 0) return '';

    const cards = uniqueItems.map((item, idx) => this.renderCard(item, idx, uniqueItems.length)).join('');
    const safeTitle = title.replace(/'/g, "\\'");
    return `
      <div class="nf-row">
        <div class="nf-row-title" onclick="window.App.exploreCategory('${safeTitle}', '${categoryType || (title.toLowerCase().includes('tv') || title.toLowerCase().includes('show') ? 'tv' : 'movie')}', '${categoryEndpoint || 'popular'}')">
          ${title}
          <span class="row-arrow">Explore All ›</span>
        </div>
        <div class="nf-slider-wrap">
          <button class="nf-scroll-btn left" onclick="MediaGrid.scroll('${rowId}', -1)" aria-label="Scroll Left">&#8249;</button>
          <div class="nf-slider" id="${rowId}">
            ${cards}
          </div>
          <button class="nf-scroll-btn right" onclick="MediaGrid.scroll('${rowId}', 1)" aria-label="Scroll Right">&#8250;</button>
        </div>
      </div>
    `;
  }

  static renderCard(item, idx, total) {
    if (!item) return '';
    const title = (item.title || item.name || 'Untitled').replace(/"/g, '&quot;');
    const cleanTitle = (item.title || item.name || 'Untitled').replace(/'/g, "\\'");
    const poster = item.poster_path 
      ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`)
      : (item.backdrop_path 
          ? (item.backdrop_path.startsWith('http') ? item.backdrop_path : `https://image.tmdb.org/t/p/w500${item.backdrop_path}`)
          : 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg');
    const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : '7.5';
    const score = Math.round((item.vote_average || 7.5) * 10);
    const year = (item.release_date || item.first_air_date || '2024').substring(0, 4);
    const isTv = item.media_type === 'tv' || Boolean(item.first_air_date) || Boolean(item.seasons_count);
    const type = item.media_type || (isTv ? 'tv' : 'movie');
    const genreStr = (item.genres || []).slice(0, 2).join(' • ') || (type === 'tv' ? 'TV Show' : 'Movie');
    const dur = item.duration || (type === 'tv' ? 'Series' : '');
    const isFirst = idx === 0;
    const isLast = idx === total - 1;
    const transformOrigin = isFirst ? 'left center' : isLast ? 'right center' : 'center';

    return `
      <div class="nf-card" style="transform-origin: ${transformOrigin};"
           data-id="${type}_${item.id}"
           data-raw-id="${item.id}"
           onclick="window.App.showDetails(${item.id}, '${type}')">
        <div class="nf-card-poster-wrap">
          <img class="nf-card-img" 
               src="${poster}" 
               alt="${title}" 
               loading="lazy"
               onerror="this.onerror=null; this.src='https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'">
          <div class="nf-card-rating-badge">★ ${rating}</div>
          <div class="nf-card-quality-badge">4K</div>
        </div>
        <div class="nf-card-info">
          <div class="nf-card-title" title="${title}">${title}</div>
          <div class="nf-card-sub">
            <span class="nf-card-year">${year}</span>
            <span class="nf-card-dot">•</span>
            <span class="nf-card-type">${type === 'tv' ? 'TV Series' : 'Movie'}</span>
          </div>
        </div>
        <div class="nf-card-hover">
          <div class="nf-card-hover-title">${title}</div>
          <div class="nf-card-hover-actions">
            <button class="nf-hov-btn play-btn" onclick="event.stopPropagation(); window.App.playMedia(${item.id}, '${type}')" title="Play">▶</button>
            <button class="nf-hov-btn" onclick="event.stopPropagation(); window.App.toggleBookmark(${item.id}, '${cleanTitle}', '${poster}', ${item.vote_average || 7.5}, '${year}', '${type}')" title="Add to My List">+</button>
            <button class="nf-hov-btn" onclick="event.stopPropagation(); window.App.showDetails(${item.id}, '${type}')" title="More Info" style="margin-left:auto;">⌄</button>
          </div>
          <div class="nf-card-hover-meta">
            <span class="nf-card-match">${score}% Match</span>
            <span class="nf-card-age">${type === 'tv' ? 'TV-MA' : 'PG-13'}</span>
            ${dur ? '<span class="nf-card-dur">' + dur + '</span>' : ''}
            <span class="nf-card-hd">4K HD</span>
          </div>
          <div class="nf-card-genres">${genreStr}</div>
        </div>
      </div>
    `;
  }

  static scroll(rowId, direction) {
    const el = document.getElementById(rowId);
    if (el) {
      const scrollAmount = Math.max(300, el.clientWidth * 0.75);
      el.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  }

  static renderSearchGrid(items) {
    if (!items || items.length === 0) {
      return '<div style="color:#888; padding:60px 0; text-align:center; font-size:1.1rem;">No titles found matching your search. Try another query.</div>';
    }
    
    // Deduplicate search results
    const seen = new Set();
    const unique = [];
    for (const item of items) {
      if (!item || !item.id) continue;
      const key = `${item.media_type || 'media'}_${item.id}`;
      if (seen.has(key) || seen.has(String(item.id))) continue;
      seen.add(key);
      seen.add(String(item.id));
      unique.push(item);
    }

    return `
      <div class="nf-search-grid">
        ${unique.map((item, i) => this.renderCard(item, i, unique.length)).join('')}
      </div>
    `;
  }
}

if (typeof window !== 'undefined') {
  window.MediaGrid = MediaGrid;
}
