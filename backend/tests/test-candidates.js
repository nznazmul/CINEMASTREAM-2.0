import axios from 'axios';

const candidates = [
  // The Last of Us
  { title: 'The Last of Us 1', url: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrne.jpg' },
  { title: 'The Last of Us 2', url: 'https://image.tmdb.org/t/p/w500/dZyda9qUo4aJ6d6z96LpB8u9bYc.jpg' },
  { title: 'The Last of Us 3 (TVMaze)', url: 'https://static.tvmaze.com/uploads/images/medium_portrait/441/1103730.jpg' },
  
  // Arcane
  { title: 'Arcane 1', url: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn397FvFeNz9H.jpg' },
  { title: 'Arcane 2 (TVMaze)', url: 'https://static.tvmaze.com/uploads/images/medium_portrait/372/930777.jpg' },
  { title: 'Arcane 3', url: 'https://image.tmdb.org/t/p/w500/z09H9V36z5q57Mv23M5177.jpg' },

  // Wednesday
  { title: 'Wednesday 1', url: 'https://image.tmdb.org/t/p/w500/9PFonQ921epTuUTXVigNV2q11C2.jpg' },
  { title: 'Wednesday 2 (TVMaze)', url: 'https://static.tvmaze.com/uploads/images/medium_portrait/443/1108507.jpg' },

  // Cyberpunk: Edgerunners
  { title: 'Cyberpunk (TVMaze)', url: 'https://static.tvmaze.com/uploads/images/medium_portrait/424/1061986.jpg' }
];

async function checkCandidates() {
  for (const c of candidates) {
    try {
      const res = await axios.head(c.url, { timeout: 3000 });
      console.log(`  ✅ [${res.status}] ${c.title} -> ${c.url}`);
    } catch (e) {
      console.log(`  ❌ [FAIL] ${c.title}`);
    }
  }
}

checkCandidates();
