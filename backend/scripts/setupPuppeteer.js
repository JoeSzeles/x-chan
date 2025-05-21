#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('This script will configure puppeteer to use a compatible browser');

// Create the puppeteerrc config file
try {
  // Define the path to create the config file
  const puppeteerConfigPath = path.join(__dirname, '..', '.puppeteerrc.cjs');

  // Create the configuration
  const puppeteerConfig = `
/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  cacheDirectory: '.cache/puppeteer',
};
`;

  // Write the configuration file
  fs.writeFileSync(puppeteerConfigPath, puppeteerConfig);
  console.log(`Created .puppeteerrc.cjs at ${puppeteerConfigPath}`);

  // Try installing system dependencies first
  console.log('Installing system dependencies for Chrome...');
  try {
    execSync('apt-get update && apt-get install -y libglib2.0-0 libnss3 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 libgbm1 libasound2', { stdio: 'inherit' });
  } catch (error) {
    console.log('\x1b[93m%s\x1b[0m', `Tools like apt, brew, and yum which modify system
dependencies are not directly callable inside Replit. We offer the
\x1b[1mSystem Dependencies\x1b[22m pane for easy dependency management.

For more information, please check
https://docs.replit.com/replit-workspace/dependency-management , and don't
forget to indicate whether you found the documentation helpful at the bottom
of the page!
`);
    console.log('Error installing system dependencies. This may require manual installation:', error.message);
  }

  console.log('Continuing with setup...');

  // Install Chrome browser
  console.log('Installing Chrome for Puppeteer...');
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
  console.log('Chrome installed successfully');

  console.log('Setup complete. You can now use puppeteer with: npm run test-scraper');
} catch (error) {
  console.error('Error setting up puppeteer:', error);
  process.exit(1);
}