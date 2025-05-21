
// Import modules with proper ES module syntax
import scraperService from '../services/scraperService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure logging
const logFilePath = path.join(logsDir, `scraper-test-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
}

// Temporarily disable mock data for testing
global.USE_MOCK_DATA = false;

// Test cases with different search terms
const testCases = [
  { name: "Basic Search", config: { url: "https://www.youtube.com/results?search_query=news", type: "video", searchTerms: "news" } },
  { name: "Tech News", config: { url: "https://www.youtube.com/results?search_query=technology", type: "video", searchTerms: "technology" } },
  { name: "Music Videos", config: { url: "https://www.youtube.com/results?search_query=music+videos", type: "video", searchTerms: "music videos" } },
  { name: "Gaming", config: { url: "https://www.youtube.com/results?search_query=gaming+news", type: "video", searchTerms: "gaming news" } },
  { name: "Multiple Terms", config: { url: "https://www.youtube.com/results?search_query=news+today", type: "video", searchTerms: "news today" } },
  { name: "Popular Channel", config: { url: "https://www.youtube.com/c/CNN/videos", type: "video", searchTerms: "CNN" } }
];

async function runTests() {
  log('=== STARTING SCRAPER DIAGNOSTIC TESTS ===');
  log(`Total test cases: ${testCases.length}`);
  log('System info:');
  log(`Node version: ${process.version}`);
  log(`Platform: ${process.platform}`);
  log(`USE_MOCK_DATA flag: ${global.USE_MOCK_DATA}`);
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    log(`\n[TEST ${i+1}/${testCases.length}] Running test: ${testCase.name}`);
    log(`URL: ${testCase.config.url}`);
    log(`Search terms: ${testCase.config.searchTerms}`);
    
    try {
      log('Starting scrape...');
      const startTime = Date.now();
      const articles = await scraperService.scrapeYouTube(testCase.config);
      const duration = Date.now() - startTime;
      
      if (!articles || !Array.isArray(articles)) {
        log(`ERROR: Invalid response - not an array`);
        continue;
      }
      
      log(`SUCCESS: Found ${articles.length} videos in ${duration}ms`);
      
      if (articles.length > 0) {
        log('Sample articles:');
        articles.slice(0, 2).forEach((article, idx) => {
          log(`- Article ${idx+1}:`);
          log(`  Title: ${article.title}`);
          log(`  URL: ${article.url}`);
          log(`  Image URL: ${article.imageUrl}`);
          
          // Validate URLs
          const validURL = article.url && (article.url.includes('youtube.com') || article.url.includes('youtu.be'));
          const validImageURL = article.imageUrl && (article.imageUrl.includes('ytimg.com') || article.imageUrl.includes('yt3.ggpht.com'));
          
          if (!validURL) log(`  WARNING: URL appears invalid`);
          if (!validImageURL) log(`  WARNING: Image URL appears invalid`);
        });
      } else {
        log('WARNING: No articles found for this test case');
      }
    } catch (error) {
      log(`ERROR: Test failed with error: ${error.message}`);
      log(`Stack trace: ${error.stack}`);
    }
  }
  
  log('\n=== SCRAPER DIAGNOSTIC COMPLETE ===');
  log(`Results saved to: ${logFilePath}`);
  logStream.end();
}

// Run the tests
runTests().catch(error => {
  log(`CRITICAL ERROR: ${error.message}`);
  log(`Stack trace: ${error.stack}`);
  logStream.end();
});
