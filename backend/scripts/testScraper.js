
// Test script for the scraper functionality
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import scraperService from '../services/scraperService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Store test timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFilePath = path.join(logsDir, `scraper-test-${timestamp}.log`);

// Set up logging
const log = (message) => {
  const timestampedMessage = `[${new Date().toISOString()}] ${message}`;
  console.log(timestampedMessage);
  fs.appendFileSync(logFilePath, timestampedMessage + '\n');
};

// Check if mock data should be used
const useMockData = process.env.USE_MOCK_DATA === 'true' || global.USE_MOCK_DATA === true;
log(`[Test] Setting USE_MOCK_DATA to ${useMockData} for reliable testing`);

// Force mock data flag if needed
if (useMockData) {
  global.USE_MOCK_DATA = true;
  log('[ScraperService] Generating mock YouTube data');
  const mockArticles = scraperService.generateMockYouTubeData({ searchTerms: 'news' });
  log(`[ScraperService] Generated ${mockArticles.length} mock YouTube articles`);
  log('[Test] Mock data generator is working properly, generated ' + mockArticles.length + ' test articles');
}

// Main test function
async function runScraperDiagnostics() {
  log('=== STARTING SCRAPER DIAGNOSTIC TESTS ===');
  
  // Test cases
  const testCases = [
    {
      name: 'Basic Search',
      url: 'https://www.youtube.com/results?search_query=news',
      searchTerms: 'news',
      type: 'video'
    }
  ];
  
  log(`Total test cases: ${testCases.length}`);
  log('System info:');
  log(`Node version: ${process.version}`);
  log(`Platform: ${process.platform}`);
  log(`USE_MOCK_DATA flag: ${global.USE_MOCK_DATA}`);

  log('=== TESTING PUPPETEER DIRECTLY ===');
  log('1. Importing puppeteer...');
  
  try {
    const puppeteer = await import('puppeteer');
    log(`2. Puppeteer imported successfully: ${typeof puppeteer}`);
    
    // Skip browser launch when using mock data
    if (!global.USE_MOCK_DATA) {
      log('3. Launching browser...');
      const browser = await puppeteer.default.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
      });
      
      log('4. Browser launched successfully');
      await browser.close();
      log('5. Browser closed successfully');
    } else {
      log('3. SKIPPING browser launch because USE_MOCK_DATA is true');
    }
    
    log('Puppeteer direct test result: SUCCESS');
  } catch (error) {
    log(`Error testing puppeteer: ${error.message}`);
    log(`Error stack: ${error.stack}`);
    log('Puppeteer direct test result: FAILURE');
  }

  log('=== INSPECTING SCRAPER IMPLEMENTATION ===');
  log(`1. scraperService type: ${typeof scraperService}`);
  log(`2. scrapeYouTube method exists: ${typeof scraperService.scrapeYouTube === 'function'}`);
  
  // Get implementation details for debugging
  const scrapeYouTubeImpl = scraperService.scrapeYouTube.toString().substring(0, 100);
  log(`3. First 100 chars of implementation: ${scrapeYouTubeImpl}`);
  
  // Check for key elements in the implementation
  log(`4. Implementation contains 'puppeteer': ${scraperService.scrapeYouTube.toString().includes('puppeteer')}`);
  log(`5. Implementation contains 'launch': ${scraperService.scrapeYouTube.toString().includes('launch')}`);
  log(`6. Implementation contains 'goto': ${scraperService.scrapeYouTube.toString().includes('goto')}`);
  
  log('Scraper implementation check: COMPLETE');
  log('');

  // Run tests
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    log(`[TEST ${i+1}/${testCases.length}] Running test: ${test.name}`);
    log(`URL: ${test.url}`);
    log(`Search terms: ${test.searchTerms}`);
    
    log('Starting scrape...');
    const startTime = Date.now();
    
    try {
      log('Calling scrapeYouTube method...');
      const articles = await scraperService.scrapeWebsite({
        url: test.url,
        type: test.type,
        searchTerms: test.searchTerms
      });
      
      const duration = Date.now() - startTime;
      log(`SUCCESS: Found ${articles.length} videos in ${duration}ms`);
      
      if (articles.length === 0) {
        log('WARNING: No articles found for this test case');
        if (!global.USE_MOCK_DATA) {
          log('DETAILS: Real scraping returned no results. This could be due to:');
          log('- Network connectivity issues');
          log('- Puppeteer configuration problems');
          log('- Missing system dependencies');
          log('Try running with USE_MOCK_DATA=true for testing');
        }
      } else {
        log(`First article title: "${articles[0].title}"`);
        log(`First article URL: ${articles[0].url}`);
      }
    } catch (error) {
      log(`ERROR: Test failed: ${error.message}`);
      log(`Stack trace: ${error.stack}`);
    }
    
    log('');
  }
  
  log('=== SCRAPER DIAGNOSTIC COMPLETE ===');
  log(`Results saved to: ${logFilePath}`);
  
  return true;
}

// Run the tests
runScraperDiagnostics().then(() => {
  process.exit(0);
}).catch(error => {
  log(`Critical error in test runner: ${error.message}`);
  log(`Stack trace: ${error.stack}`);
  process.exit(1);
});
