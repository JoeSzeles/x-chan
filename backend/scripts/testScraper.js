// Test script for the scraper functionality
import path from 'path';
import { fileURLToPath } from 'url';
import { ScraperService } from '../services/scraperService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== SCRAPER TEST SCRIPT ===');
console.log('Working directory:', process.cwd());
console.log('Script location:', __dirname);

// Force enable mock data for testing
global.USE_MOCK_DATA = true;

// Test URLs
const testUrls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://twitter.com/elonmusk/status/1500613391810129921',
  'https://x.com/Microsoft/status/1499762914824990727'
];

async function runTests() {
  try {
    const scraperService = new ScraperService();

    console.log('STARTING SCRAPER DIAGNOSTIC TESTS');
    console.log('-------------------------------------');
    console.log(`Total test URLs: ${testUrls.length}`);
    console.log('Mock data mode:', global.USE_MOCK_DATA ? 'ENABLED' : 'DISABLED');

    for (const [index, url] of testUrls.entries()) {
      console.log(`\nTest ${index + 1}: Scraping ${url}`);
      try {
        console.time(`Test ${index + 1} duration`);
        const result = await scraperService.scrapeWebsite({ url });
        console.timeEnd(`Test ${index + 1} duration`);

        console.log('Result:', {
          title: result.title,
          description: result.description ? result.description.substring(0, 100) + '...' : 'None',
          hasMedia: !!result.media,
          type: result.type
        });
      } catch (error) {
        console.error(`Error in Test ${index + 1}:`, error.message);
      }
    }

    console.log('\n-------------------------------------');
    console.log('SCRAPER TESTS COMPLETED');
  } catch (error) {
    console.error('CRITICAL ERROR during tests:', error);
    process.exit(1);
  }
}

runTests();