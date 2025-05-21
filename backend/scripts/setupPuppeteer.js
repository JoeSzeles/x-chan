
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
  // Create a .puppeteerrc.cjs file in the project root to configure puppeteer
  const rcPath = path.join(__dirname, '..', '.puppeteerrc.cjs');
  
  // Configuration to make puppeteer use a system-compatible browser
  const puppeteerConfig = `
module.exports = {
  cacheDirectory: '.cache/puppeteer',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
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

  // Modify scraperService to use mock data if browser fails to launch
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
        '            return {\n' +
        '                title: "Mock YouTube Video",\n' +
        '                description: "This is mock data when puppeteer is unavailable",\n' +
        '                videoId: "dQw4w9WgXcQ"\n' +
        '            };\n' +
        '        }\n'
      );
      
      fs.writeFileSync(scraperServicePath, scraperService);
      console.log('Updated scraperService.js with mock data fallback');
    }
  }

  console.log('Puppeteer setup completed successfully');
} catch (error) {
  console.error('Error during puppeteer setup:', error);
  process.exit(1);
}
