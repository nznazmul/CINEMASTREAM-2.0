import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => row[h.trim()] = values[idx]);
      rows.push(row);
    }
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i+1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const args = process.argv.slice(2);
const query = args[0] || '';
let domain = null;
let maxResults = 3;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--domain' || args[i] === '-d') domain = args[i+1];
  if (args[i] === '--max-results' || args[i] === '-n') maxResults = parseInt(args[i+1]) || 3;
}

const fileMap = {
  style: 'styles.csv',
  color: 'colors.csv',
  chart: 'charts.csv',
  landing: 'landing.csv',
  product: 'products.csv',
  ux: 'ux-guidelines.csv',
  typography: 'typography.csv',
  icons: 'icons.csv',
  motion: 'motion.csv'
};

const targetFile = domain && fileMap[domain] ? fileMap[domain] : 'styles.csv';
const filePath = path.join(DATA_DIR, targetFile);

console.log(`\n🔍 [UI/UX Pro Max Engine] Searching in domain: ${domain || 'general'} | Query: "${query}"\n`);

if (fs.existsSync(filePath)) {
  const rows = parseCSV(filePath);
  const qTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  
  const matches = rows.map(row => {
    let score = 0;
    const str = Object.values(row).join(' ').toLowerCase();
    for (const term of qTerms) {
      if (str.includes(term)) score += 1;
    }
    return { row, score };
  })
  .filter(m => qTerms.length === 0 || m.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, maxResults)
  .map(m => m.row);

  if (matches.length > 0) {
    console.log(`Found ${matches.length} matching guidelines & patterns:\n`);
    matches.forEach((item, idx) => {
      console.log(`### Result ${idx + 1}`);
      for (const [k, v] of Object.entries(item)) {
        console.log(`- **${k}:** ${v}`);
      }
      console.log('');
    });
  } else {
    console.log('No direct matches found. Showing default top recommendations:');
    rows.slice(0, 2).forEach((item, idx) => {
      console.log(`### Recommendation ${idx + 1}`);
      for (const [k, v] of Object.entries(item)) {
        console.log(`- **${k}:** ${v}`);
      }
      console.log('');
    });
  }
} else {
  console.log(`Data file not found: ${filePath}`);
}
