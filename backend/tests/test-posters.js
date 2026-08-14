import axios from 'axios';

const posters = [
  { title: 'Dune: Part Two', url: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg' },
  { title: 'Deadpool & Wolverine', url: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg' },
  { title: 'Oppenheimer', url: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' },
  { title: 'House of the Dragon', url: 'https://image.tmdb.org/t/p/w500/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg' },
  { title: 'Interstellar', url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
  { title: 'Stranger Things', url: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg' },
  { title: 'The Dark Knight', url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
  { title: 'Avatar: The Way of Water', url: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg' },
  { title: 'Gladiator II', url: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg' },
  { title: 'Avengers: Endgame', url: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg' },
  { title: 'Spider-Man: No Way Home', url: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg' },
  { title: 'John Wick: Chapter 4', url: 'https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg' },
  { title: 'Top Gun: Maverick', url: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg' },
  { title: 'Inception', url: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg' },
  { title: 'The Matrix', url: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg' },
  { title: 'Blade Runner 2049', url: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg' },
  { title: 'The Shawshank Redemption', url: 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg' },
  { title: 'The Godfather', url: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg' },
  { title: 'Fight Club', url: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg' },
  { title: 'Game of Thrones', url: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg' },
  { title: 'Breaking Bad', url: 'https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg' },
  { title: 'The Last of Us', url: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrne.jpg' },
  { title: 'Attack on Titan', url: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg' },
  { title: 'Demon Slayer', url: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg' },
  { title: 'Arcane', url: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn397FvFeNz9H.jpg' },
  { title: 'Wednesday', url: 'https://image.tmdb.org/t/p/w500/9PFonQ921epTuUTXVigNV2q11C2.jpg' },
  { title: 'Squid Game', url: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg' },
  { title: 'Shōgun', url: 'https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg' }
];

async function testPosters() {
  console.log('Testing official TMDB poster URLs...\n');
  let ok = 0;
  for (const p of posters) {
    try {
      const res = await axios.head(p.url, { timeout: 4000 });
      if (res.status === 200) {
        console.log(`  ✅ [200 OK] ${p.title}`);
        ok++;
      } else {
        console.log(`  ❌ [${res.status}] ${p.title}`);
      }
    } catch (e) {
      console.log(`  ⚠️ [FAILED] ${p.title}: ${e.message}`);
    }
  }
  console.log(`\nResult: ${ok}/${posters.length} verified 200 OK.`);
}

testPosters();
