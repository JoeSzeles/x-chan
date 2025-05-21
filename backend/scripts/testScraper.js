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
  { name: "Basic Search", config: { url: "https://www.youtube.com/results?search_query=news", type: "video", searchTerms: "news" } }
];

// Add a simple mock implementation to check if puppeteer is the issue
async function testPuppeteerDirectly() {
  log('=== TESTING PUPPETEER DIRECTLY ===');
  try {
    // Try to load puppeteer
    log('1. Importing puppeteer...');
    const puppeteer = await import('puppeteer');
    log(`2. Puppeteer imported successfully: ${typeof puppeteer}`);

    // Try to launch browser
    log('3. Attempting to launch browser...');
    try {
      const browser = await puppeteer.default.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote'
        ],
        headless: "new",
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
      });

      log('4. Browser launched successfully!');

      // Try to open page
      const page = await browser.newPage();
      log('5. New page opened successfully');

      // Try to navigate to a simple URL
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
      log('6. Navigation successful');

      // Try to extract content
      const title = await page.title();
      log(`7. Page title: ${title}`);

      await browser.close();
      log('8. Browser closed successfully');
      return true;
    } catch (error) {
      log(`ERROR launching browser: ${error.message}`);
      log(`Stack trace: ${error.stack}`);
      return false;
    }
  } catch (error) {
    log(`ERROR importing puppeteer: ${error.message}`);
    log(`Stack trace: ${error.stack}`);
    return false;
  }
}

// Test the scrapeYouTube method implementation
async function testScraperImplementation() {
  log('=== INSPECTING SCRAPER IMPLEMENTATION ===');

  try {
    // Check if scrapeYouTube exists
    log(`1. scraperService type: ${typeof scraperService}`);
    log(`2. scrapeYouTube method exists: ${typeof scraperService.scrapeYouTube === 'function'}`);

    // Check implementation details
    const fnStr = scraperService.scrapeYouTube.toString();
    log(`3. First 100 chars of implementation: ${fnStr.substring(0, 100)}...`);

    // Check for critical keywords
    const hasPuppeteer = fnStr.includes('puppeteer');
    const hasLaunch = fnStr.includes('launch');
    const hasGoto = fnStr.includes('goto');

    log(`4. Implementation contains 'puppeteer': ${hasPuppeteer}`);
    log(`5. Implementation contains 'launch': ${hasLaunch}`);
    log(`6. Implementation contains 'goto': ${hasGoto}`);

    return true;
  } catch (error) {
    log(`ERROR inspecting implementation: ${error.message}`);
    return false;
  }
}

async function runTests() {
  log('=== STARTING SCRAPER DIAGNOSTIC TESTS ===');
  log(`Total test cases: ${testCases.length}`);
  log('System info:');
  log(`Node version: ${process.version}`);
  log(`Platform: ${process.platform}`);
  log(`USE_MOCK_DATA flag: ${global.USE_MOCK_DATA}`);

  // First test puppeteer directly
  const puppeteerWorks = await testPuppeteerDirectly();
  log(`Puppeteer direct test result: ${puppeteerWorks ? 'SUCCESS' : 'FAILED'}`);

  // Then check the scraper implementation
  const implCheck = await testScraperImplementation();
  log(`Scraper implementation check: ${implCheck ? 'COMPLETE' : 'FAILED'}`);

  // If either test failed, skip the scraper tests
  if (!puppeteerWorks) {
    log('CRITICAL ERROR: Puppeteer is not working correctly. Skipping YouTube scraper tests.');
    log('This suggests an issue with the puppeteer installation or browser execution environment.');
    logStream.end();
    return;
  }

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    log(`\n[TEST ${i+1}/${testCases.length}] Running test: ${testCase.name}`);
    log(`URL: ${testCase.config.url}`);
    log(`Search terms: ${testCase.config.searchTerms}`);

    try {
      log('Starting scrape...');
      const startTime = Date.now();

      // Add instrumentation to trace the execution
      log('Calling scrapeYouTube method...');

      // Add a timeout to ensure we don't wait forever
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Scrape timed out after 30 seconds')), 30000);
      });

      // Race between the actual scrape and timeout
      const articles = await Promise.race([
        scraperService.scrapeYouTube(testCase.config),
        timeoutPromise
      ]);

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