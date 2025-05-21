
// Script to configure puppeteer for a headless environment
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== PUPPETEER SETUP SCRIPT ===');
console.log('This script will configure puppeteer to use a compatible browser');

try {
  // Install required system dependencies for Chrome
  console.log('Installing system dependencies for Chrome...');
  try {
    execSync('apt-get update && apt-get install -y libglib2.0-0 libnss3 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 libgbm1 libasound2', { 
      stdio: 'inherit',
      shell: true 
    });
    console.log('System dependencies installed successfully');
  } catch (error) {
    console.error('Error installing system dependencies. This may require manual installation:', error.message);
    console.log('Continuing with setup...');
  }

  // Create a .puppeteerrc.cjs file in the project root to configure puppeteer
  const rcPath = path.join(__dirname, '..', '.puppeteerrc.cjs');
  
  // Configuration to make puppeteer use a system-compatible browser
  const puppeteerConfig = `
module.exports = {
  cacheDirectory: '.cache/puppeteer',
  skipDownload: false,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ]
};
`;

  fs.writeFileSync(rcPath, puppeteerConfig);
  console.log('Created .puppeteerrc.cjs configuration file');

  // Ensure scraperService always falls back to mock data
  const scraperServicePath = path.join(__dirname, '..', 'services', 'scraperService.js');
  if (fs.existsSync(scraperServicePath)) {
    let scraperService = fs.readFileSync(scraperServicePath, 'utf8');
    
    // Add fallback to mock data if not already there
    if (!scraperService.includes('USE_MOCK_DATA')) {
      scraperService = scraperService.replace(
        'async scrapeYouTube(website) {',
        'async scrapeYouTube(website) {\n' +
        '        // Fall back to mock data if USE_MOCK_DATA is true\n' +
        '        if (global.USE_MOCK_DATA) {\n' +
        '            console.log("[ScraperService] Using mock data for YouTube");\n' +
        '            return this.generateMockYouTubeData(website);\n' +
        '        }\n'
      );
      
      fs.writeFileSync(scraperServicePath, scraperService);
      console.log('Updated scraperService.js with mock data fallback');
    }
  }

  // Create a package.json script for easier testing
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts['test-scraper']) {
      packageJson.scripts['test-scraper'] = 'node scripts/testScraper.js';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('Added test-scraper script to package.json');
    }
  }

  // Install Chrome for Puppeteer if needed
  try {
    console.log('Installing Chrome for Puppeteer...');
    execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
    console.log('Chrome installed successfully');
  } catch (error) {
    console.error('Error installing Chrome:', error.message);
  }

  console.log('Puppeteer setup completed successfully');
} catch (error) {
  console.error('Error during puppeteer setup:', error);
  process.exit(1);
}
