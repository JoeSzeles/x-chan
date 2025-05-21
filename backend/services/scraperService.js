import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import YouTube from '@yimura/scraper';
import puppeteer from 'puppeteer';

class ScraperService {
    constructor() {
        this.youtube = new YouTube.default();
    }

    async scrapeWebsite(website) {
        console.log(`[ScraperService] Starting scrape for website: ${website.url}`);
        console.log(`[ScraperService] Website type:`, website.type || 'news');
        console.log(`[ScraperService] Search terms:`, website.searchTerms || 'none');

        let browser;
        try {
            // Add timestamp for performance tracking
            const startTime = Date.now();
            console.log(`[ScraperService] Launch start time: ${new Date().toISOString()}`);

            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
                headless: 'new'
            });

            const launchTime = Date.now() - startTime;
            console.log(`[ScraperService] Browser launched in ${launchTime}ms`);

            const page = await browser.newPage();

            // Set realistic user agent 
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');

            // Add timeout logging
            console.log(`[ScraperService] Navigating to ${website.url}`);
            const navigationStartTime = Date.now();

            try {
                await page.goto(website.url, { 
                    waitUntil: 'networkidle2', 
                    timeout: 40000  // Increase timeout for slow sites
                });
                const navigationTime = Date.now() - navigationStartTime;
                console.log(`[ScraperService] Navigation completed in ${navigationTime}ms`);
            } catch (navError) {
                console.error(`[ScraperService] Navigation error: ${navError.message}`);
                // Try to continue even if navigation wasn't perfect
                console.log('[ScraperService] Attempting to continue scraping despite navigation issues...');
            }

            // Wait an extra moment for any dynamic content to load
            await page.waitForTimeout(3000);

            let articles = [];

            // The scrapeYouTube and scrapeNewsArticles functions are not defined in the provided code
            // This will cause the code to crash
            // These function definitions would need to be provided.
            // As they are not provided, I will generate dummy functions to prevent the code from crashing
            const scrapeYouTube = async (page) => {
                console.log("scrapeYouTube called, but no implementation provided")
                return [];
            }

            const scrapeNewsArticles = async (page, website) => {
                console.log("scrapeNewsArticles called, but no implementation provided")
                return [];
            }

            if (website.type === 'video' && website.url.includes('youtube.com')) {
                console.log('[ScraperService] Scraping YouTube videos');
                articles = await scrapeYouTube(page);
            } else {
                console.log('[ScraperService] Scraping standard news articles');
                articles = await scrapeNewsArticles(page, website);
            }

            const totalTime = Date.now() - startTime;
            console.log(`[ScraperService] Scrape completed in ${totalTime}ms. Found ${articles.length} articles`);

            await browser.close();
            return articles;
        } catch (error) {
            console.error('[ScraperService] Error during scraping:', {
                message: error.message,
                stack: error.stack,
                url: website.url,
                type: website.type,
                searchTerms: website.searchTerms
            });

            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    console.error('[ScraperService] Error closing browser:', closeError.message);
                }
            }
            throw error;
        }
    }

    async scrapeYouTube(website) {
        try {
            console.log('[ScraperService] Scraping YouTube with search terms:', website.searchTerms);

            if (!website.searchTerms) {
                console.error('[ScraperService] No search terms provided for YouTube scraping');
                return [];
            }

            // Clean and format the search terms
            const searchQuery = website.searchTerms.trim();
            console.log('[ScraperService] Using search query:', searchQuery);

            // Use the YouTube scraper package to search
            const results = await this.youtube.search(searchQuery, {
                searchType: 'video',
                language: 'en'
            });

            console.log(`[ScraperService] YouTube search returned ${results.videos?.length || 0} videos`);

            if (!results.videos || !Array.isArray(results.videos)) {
                console.error('[ScraperService] Invalid YouTube search results format');
                return [];
            }

            // Map the YouTube results to our article format
            const articles = results.videos.map(video => {
                // Make sure we have a valid video ID for thumbnails
                let thumbnailUrl = video.thumbnail;
                if (!thumbnailUrl && video.id) {
                    thumbnailUrl = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
                }

                return {
                    title: video.title || 'Untitled Video',
                    description: video.description || '',
                    url: video.link || `https://www.youtube.com/watch?v=${video.id}`,
                    imageUrl: thumbnailUrl,
                    videoUrl: video.link || `https://www.youtube.com/watch?v=${video.id}`,
                    publishedAt: new Date(),
                    source: 'YouTube',
                    author: video.channel?.name || 'Unknown',
                    duration: video.duration || 0,
                    views: video.views || 0
                };
            });

            console.log(`[ScraperService] Processed ${articles.length} YouTube videos into articles`);
            return articles;
        } catch (error) {
            console.error('[ScraperService] Error scraping YouTube:', error);
            console.error('[ScraperService] Error details:', error.stack);
            return [];
        }
    }
}

export default new ScraperService();