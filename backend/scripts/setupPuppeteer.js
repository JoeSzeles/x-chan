// Script to configure puppeteer for a headless environment
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== PUPPETEER SETUP SCRIPT ===');
console.log('Working directory:', process.cwd());
console.log('Script location:', __dirname);

try {
  // Create a .puppeteerrc.cjs file in the project root to configure puppeteer
  const rcPath = path.join(__dirname, '..', '.puppeteerrc.cjs');
  console.log('Creating puppeteer config at:', rcPath);

  // Configuration to make puppeteer use a system-compatible browser
  const puppeteerConfig = `
module.exports = {
  cacheDirectory: '${path.join(process.env.HOME || '/home/runner', '.cache/puppeteer')}',
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
  console.log('✅ Created .puppeteerrc.cjs configuration file');

  // Install chrome if needed
  try {
    console.log('Checking Chrome installation...');
    const chromePath = path.join(process.env.HOME || '/home/runner', '.cache/puppeteer/chrome/linux-136.0.7103.49/chrome-linux64/chrome');

    if (!fs.existsSync(chromePath)) {
      console.log('Chrome not found, installing...');
      execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
      console.log('✅ Chrome installed successfully');
    } else {
      console.log('✅ Chrome already installed at:', chromePath);
    }
  } catch (error) {
    console.error('❌ Error installing Chrome:', error.message);
  }

  // Update package.json to add test-scraper script
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (!packageJson.scripts['test-scraper']) {
      packageJson.scripts['test-scraper'] = 'node scripts/testScraper.js';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Added test-scraper script to package.json');
    }
  }

  console.log('✅ Puppeteer setup completed successfully');
  console.log('To test the scraper, run: cd backend && npm run test-scraper');
} catch (error) {
  console.error('❌ Error during puppeteer setup:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}