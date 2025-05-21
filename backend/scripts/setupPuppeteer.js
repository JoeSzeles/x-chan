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

  // Try installing system dependencies using Replit-compatible methods
  console.log('Installing system dependencies for Chrome...');
  try {
    console.log('Creating a list of required Chrome dependencies');
    // Create file with list of dependencies
    const dependenciesFile = path.join(__dirname, '..', 'chrome-dependencies.txt');
    fs.writeFileSync(dependenciesFile, `
libglib2.0-0
libnss3
libx11-xcb1
libxcb1
libxcomposite1
libxcursor1
libxdamage1
libxext6
libxfixes3
libxi6
libxrandr2
libxrender1
libxss1
libxtst6
libgbm1
libasound2
libatk1.0-0
libatk-bridge2.0-0
libcups2
libdrm2
libdbus-1-3
libxcb-dri3-0
libxcomposite1
libxkbcommon0
libgtk-3-0
`);
    console.log('Chrome dependencies list created at:', dependenciesFile);
    console.log('NOTE: You need to manually install these dependencies in Replit via System Dependencies pane');
    console.log('After installing dependencies, please run this script again');
  } catch (error) {
    console.log('\x1b[93m%s\x1b[0m', `Error creating dependencies list. Please manually add Chrome dependencies
through the System Dependencies pane in Replit.

Required packages:
- libglib2.0-0
- libnss3
- libx11-xcb1
- libxcb1
- libxcomposite1
... and others

For more information, please check
https://docs.replit.com/replit-workspace/dependency-management
`);
    console.log('Error managing system dependencies:', error.message);
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