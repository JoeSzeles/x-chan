import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

class ScraperService {
    async scrapeWebsite(website) {
        try {
            console.log(`[Scraper] Starting scrape for ${website.url} with type: ${website.type}`);
            console.log('[Scraper] Website config:', {
                url: website.url,
                type: website.type,
                searchTerms: website.searchTerms
            });

            // Handle different website types
            if (website.type === 'video' || website.url.includes('youtube.com')) {
                console.log('[Scraper] Detected YouTube video type, using YouTube scraper');
                return await this.scrapeYouTube(website);
            } else if (website.url.includes('twitter.com') || website.url.includes('x.com')) {
                return await this.scrapeTwitter(website);
            }

            // Use regular scraping for other sites
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0',
                'Origin': 'https://www.youtube.com',
                'Referer': 'https://www.youtube.com/'
            };

            const response = await axios.get(website.url, { 
                headers,
                timeout: 30000,
                withCredentials: true
            });

            const $ = cheerio.load(response.data);
            let elements = $(website.selector);

            if (elements.length === 0) {
                console.log('[Scraper] Warning: No elements found with selector');
                return [];
            }

            return this.parseNewsWebsite($, website, elements);

        } catch (error) {
            console.error('[Scraper] Error scraping website:', error);
            return [];
        }
    }

    #lastScrapeTime = null;
    #minScrapingInterval = 5 * 60 * 1000; // 5 minutes

    async scrapeYouTube(website) {
        // Check if enough time has passed since last scrape
        const now = Date.now();
        if (this.#lastScrapeTime && (now - this.#lastScrapeTime) < this.#minScrapingInterval) {
            console.log('[ScraperService] Skipping scrape - too soon since last attempt');
            return [];
        }
        
        this.#lastScrapeTime = now;
        console.log('[ScraperService] Starting YouTube scraping for:', website.url);
        console.log('[ScraperService] Website config:', {
            url: website.url,
            type: website.type,
            searchTerms: website.searchTerms
        });

        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            console.log('[ScraperService] Browser launched successfully');
            const page = await browser.newPage();

            // Set viewport and user agent
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

            console.log('[ScraperService] Page configured with viewport and user agent');

            const articles = [];
            const searchTerms = website.searchTerms.split(',').map(term => term.trim()).filter(term => term);

            console.log('[ScraperService] Processing search terms:', searchTerms);

            for (const term of searchTerms) {
                try {
                    console.log('[ScraperService] Processing search term:', term);
                    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}&sp=CAI%253D`;
                    console.log('[ScraperService] Navigating to:', searchUrl);

                    await page.goto(searchUrl, { waitUntil: 'networkidle0' });
                    console.log('[ScraperService] Page loaded successfully');

                    // Wait for video elements to load
                    await page.waitForSelector('ytd-video-renderer', { timeout: 10000 })
                        .catch(() => console.log('[ScraperService] No video elements found'));

                    // Extract video information
                    const videos = await page.evaluate(() => {
                        const videoElements = document.querySelectorAll('ytd-video-renderer');
                        console.log('[ScraperService] Video elements found:', videoElements.length);

                        return Array.from(videoElements).map(video => {
                            try {
                                const titleElement = video.querySelector('#video-title');
                                const channelElement = video.querySelector('#channel-name');
                                const viewsElement = video.querySelector('#metadata-line span');
                                const thumbnailElement = video.querySelector('#thumbnail img');
                                const linkElement = video.querySelector('#video-title');

                                if (!titleElement || !linkElement) {
                                    console.log('[ScraperService] Missing required elements for video');
                                    return null;
                                }

                                return {
                                    title: titleElement.textContent.trim(),
                                    channel: channelElement?.textContent.trim() || 'Unknown Channel',
                                    views: viewsElement?.textContent.trim() || '0 views',
                                    url: linkElement.href,
                                    thumbnail: thumbnailElement?.src || null
                                };
                            } catch (error) {
                                console.error('[ScraperService] Error extracting video:', error);
                                return null;
                            }
                        }).filter(video => video !== null);
                    });

                    console.log('[ScraperService] Extracted', videos.length, 'videos');

                    // Convert videos to articles
                    for (const video of videos) {
                        const article = {
                            title: video.title,
                            description: `Channel: ${video.channel}\nViews: ${video.views}`,
                            url: video.url,
                            imageUrl: video.thumbnail,
                            publishedAt: new Date(),
                            source: 'youtube',
                            type: 'video'
                        };
                        articles.push(article);
                    }

                } catch (error) {
                    console.error('[ScraperService] Error processing search term:', term, error);
                }
            }

            console.log('[ScraperService] Total videos found:', articles.length);
            return articles;

        } catch (error) {
            console.error('[ScraperService] Error in scrapeYouTube:', error);
            return []; // Return empty array instead of throwing error
        } finally {
            await browser.close();
            console.log('[ScraperService] Browser closed');
        }
    }

    async scrapeTwitter(website) {
        console.log('[Scraper] Using Puppeteer for Twitter feed scraping');

        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
            });

            const page = await browser.newPage();

            // Set viewport and user agent
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Enable request interception
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                if (request.resourceType() === 'image' || request.resourceType() === 'stylesheet' || request.resourceType() === 'font') {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            // Navigate to Twitter
            await page.goto('https://twitter.com/home', {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Wait for tweets to load
            await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });

            // Extract tweet information
            const tweets = await page.evaluate(() => {
                const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
                return Array.from(tweetElements).slice(0, 10).map(tweet => {
                    const authorElement = tweet.querySelector('[data-testid="User-Name"]');
                    const contentElement = tweet.querySelector('[data-testid="tweetText"]');
                    const timeElement = tweet.querySelector('time');
                    const imageElement = tweet.querySelector('img[src*="pbs.twimg.com/media"]');

                    return {
                        author: authorElement?.textContent?.trim() || '',
                        content: contentElement?.textContent?.trim() || '',
                        publishedAt: timeElement?.getAttribute('datetime') || '',
                        imageUrl: imageElement?.src || ''
                    };
                });
            });

            await browser.close();

            // Convert to articles
            const articles = tweets.map(tweet => ({
                title: tweet.content.substring(0, 100) + (tweet.content.length > 100 ? '...' : ''),
                description: tweet.content,
                url: `https://twitter.com/${tweet.author}/status/${tweet.id}`,
                imageUrl: tweet.imageUrl,
                publishedAt: tweet.publishedAt,
                source: {
                    name: 'Twitter',
                    url: website.url
                },
                metadata: {
                    author: tweet.author
                }
            }));

            console.log(`[Scraper] Total tweets found: ${articles.length}`);
            return articles;

        } catch (error) {
            console.error('[Scraper] Error in Twitter scraping:', error);
            return [];
        }
    }

    async handleJsonResponse(response, website) {
        try {
            // Axios already parses JSON responses
            const data = response.data;
            console.log('[Scraper] Processing JSON response for:', website.url);
            console.log('[Scraper] Response data type:', typeof data);
            console.log('[Scraper] Response data keys:', Object.keys(data));

            if (website.url.includes('rss2json.com')) {
                const articles = [];
                if (data.items && Array.isArray(data.items)) {
                    console.log('[Scraper] Processing', data.items.length, 'videos from RSS feed');
                    for (const item of data.items) {
                        try {
                            console.log('[Scraper] Processing item:', {
                                title: item.title,
                                link: item.link,
                                pubDate: item.pubDate
                            });

                            const videoId = item.link.split('v=')[1] || item.link.split('/').pop();
                            const views = item.description.match(/(\d+(?:,\d+)*)\s*views/)?.[1] || '0';
                            const publishedAt = new Date(item.pubDate);

                            const article = {
                                title: item.title,
                                description: item.description,
                                url: item.link,
                                imageUrl: item.thumbnail,
                                publishedAt: publishedAt,
                                author: item.author,
                                source: {
                                    name: 'YouTube',
                                    url: item.link
                                },
                                metadata: {
                                    views: views,
                                    publishedDate: publishedAt.toISOString()
                                }
                            };

                            console.log('[Scraper] Created article:', article);
                            articles.push(article);
                        } catch (error) {
                            console.error('[Scraper] Error processing video item:', error);
                            console.error('[Scraper] Item that caused error:', item);
                        }
                    }
                    console.log('[Scraper] Successfully processed', articles.length, 'articles');
                } else {
                    console.warn('[Scraper] No items found in RSS feed response');
                    console.warn('[Scraper] Response data:', data);
                }
                return articles;
            }

            // Handle other JSON responses
            const articles = [];
            const elements = data[website.selector] || [];

            for (const element of elements) {
                try {
                    const article = this.extractArticleData(element, website);
                    if (article) {
                        articles.push(article);
                    }
                } catch (error) {
                    console.error('[Scraper] Error processing element:', error);
                }
            }

            return articles;
        } catch (error) {
            console.error('[Scraper] Error handling JSON response:', error);
            console.error('[Scraper] Response that caused error:', response);
            throw error;
        }
    }

    parseNewsWebsite($, website, elements) {
        const articles = [];

        elements.each((_, element) => {
            try {
                const $element = $(element);
                const title = this.findText($element, ["h1", "h2", "h3", ".title", "[class*='title']"]);
                const description = this.findText($element, ["p", ".description", "[class*='description']"]);
                const url = this.findAttribute($element, "a", "href");
                const imageUrl = this.findAttribute($element, "img", "src");
                const publishedAt = this.findAttribute($element, "time", "datetime") || new Date().toISOString();
                const source = {
                    name: new URL(website.url).hostname,
                    url: website.url
                };

                if (title || description) {
                    articles.push({
                        title: title || "Untitled Article",
                        description: description || "No description available",
                        url: url ? this.normalizeUrl(url, website.url) : website.url,
                        imageUrl: imageUrl ? this.normalizeUrl(imageUrl, website.url) : null,
                        publishedAt,
                        source,
                        content: description || "No content available",
                        website: {
                            url: website.url,
                            type: website.type
                        }
                    });
                }
            } catch (error) {
                console.warn("Error parsing article:", error);
            }
        });

        return articles;
    }

    parseBlogWebsite($, website, elements) {
        return this.parseNewsWebsite($, website, elements);
    }

    parseSocialWebsite($, website, elements) {
        const articles = [];

        elements.each((_, element) => {
            try {
                const $element = $(element);
                const content = this.findText($element, [".content", ".text", ".message", "[class*='content']"]);
                const author = this.findText($element, [".author", ".username", "[class*='author']"]);
                const publishedAt = this.findAttribute($element, "time", "datetime") || new Date().toISOString();
                const url = this.findAttribute($element, "a", "href");
                const imageUrl = this.findAttribute($element, "img", "src");

                if (content) {
                    articles.push({
                        title: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
                        description: content,
                        url: url ? this.normalizeUrl(url, website.url) : website.url,
                        imageUrl: imageUrl ? this.normalizeUrl(imageUrl, website.url) : null,
                        publishedAt,
                        author: author || "Unknown",
                        source: {
                            name: new URL(website.url).hostname,
                            url: website.url
                        },
                        content,
                        website: {
                            url: website.url,
                            type: website.type
                        }
                    });
                }
            } catch (error) {
                console.warn("Error parsing social post:", error);
            }
        });

        return articles;
    }

    findText($element, selectors) {
        for (const selector of selectors) {
            const text = $element.find(selector).first().text().trim();
            if (text) return text;
        }
        return null;
    }

    findAttribute($element, selector, attribute) {
        const value = $element.find(selector).first().attr(attribute);
        return value ? value.trim() : null;
    }

    normalizeUrl(url, baseUrl) {
        try {
            return new URL(url, baseUrl).href;
        } catch (error) {
            console.warn("Error normalizing URL:", error);
            return url;
        }
    }
}

export default new ScraperService();