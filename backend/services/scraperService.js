import axios from "axios";
import * as cheerio from "cheerio";
// Using dynamic import for @yimura/scraper (imported in the scrapeYouTube method)

class ScraperService {
    async scrapeWebsite(website) {
        console.log('[ScraperService] Starting scrape of website:', {
            url: website.url,
            type: website.type,
            searchTerms: website.searchTerms
        });

        // Check if we're using mock data
        if (global.USE_MOCK_DATA) {
            console.log('[ScraperService] Using mock data for scraping');

            if (website.type === 'video' && website.url.includes('youtube.com')) {
                console.log('[ScraperService] Generating YouTube mock data');
                const articles = this.generateMockYouTubeData(website);
                console.log(`[ScraperService] Generated ${articles.length} mock YouTube articles`);
                return articles;
            }

            // Return mock data for other types
            console.log('[ScraperService] Generating generic mock news data');
            const articles = this.generateMockNewsData(website);
            console.log(`[ScraperService] Generated ${articles.length} mock news articles`);
            return articles;
        }
        console.log('[ScraperService] Starting scrape:', {
            url: website.url,
            type: website.type,
            timestamp: new Date().toISOString()
        });
        try {
            // Validate website configuration
            if (!website.url) {
                console.error('[ScraperService] Missing URL in website config');
                return [];
            }

            console.log(`[Scraper] Starting scrape for ${website.url} with type: ${website.type || 'news'}`);

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
                'Cache-Control': 'max-age=0'
            };

            let response;
            try {
                response = await axios.get(website.url, { 
                headers,
                timeout: 30000,
                withCredentials: true
            });
            } catch (error) {
                console.error('[Scraper] Error fetching website:', error.message);
                return [];
            }

            if (!response || !response.data) {
                console.error('[Scraper] Empty response from website');
                return [];
            }

            const $ = cheerio.load(response.data);

            // Ensure we have a valid selector
            const selector = website.selector || 'article';
            let elements = $(selector);

            if (elements.length === 0) {
                console.log('[Scraper] Warning: No elements found with selector, trying fallback selectors');
                // Try some common fallback selectors
                const fallbackSelectors = ['article', '.article', '.post', '.news-item', '.story', '.entry'];
                for (const fallbackSelector of fallbackSelectors) {
                    elements = $(fallbackSelector);
                    if (elements.length > 0) {
                        console.log(`[Scraper] Found elements with fallback selector: ${fallbackSelector}`);
                        break;
                    }
                }
            }

            if (elements.length === 0) {
                console.log('[Scraper] Warning: No elements found with any selector');
                return [];
            }

            const articles = this.parseNewsWebsite($, website, elements);
            console.log(`[Scraper] Successfully parsed ${articles.length} articles from ${website.url}`);
            return articles;

        } catch (error) {
            console.error('[Scraper] Error scraping website:', error.message);
            console.error('[Scraper] Error stack:', error.stack);
            return [];
        }
    }

    async scrapeYouTube(website) {
        console.log('[ScraperService] Starting YouTube scraping for:', website.url);
        console.log('[ScraperService] Website config:', {
            url: website.url,
            type: website.type,
            searchTerms: website.searchTerms
        });

        try {
            // Import the YouTube scraper
            const Scraper = (await import('@yimura/scraper')).default;
            const youtube = new Scraper.default();

            // Clean up and validate search terms
            const sensitiveTerms = ['nsfw', 'xxx', 'porn'];
            let searchTermsString = website.searchTerms || "technology news";
            searchTermsString = searchTermsString.replace(/,\s*$/, ''); // Clean up trailing commas

            // Check for potentially filtered terms and provide safer alternatives
            if (sensitiveTerms.some(term => searchTermsString.toLowerCase().includes(term))) {
                console.log('[ScraperService] Detected potentially filtered search terms, using safer alternatives');
                searchTermsString = "news, gaming news, tech reviews";
            }

            const searchTerms = searchTermsString.split(',').map(term => term.trim()).filter(term => term);
            if (searchTerms.length === 0) {
                searchTerms.push("technology news"); // Default search term if none provided
            }

            console.log('[ScraperService] Processing search terms:', searchTerms);
            
            const articles = [];
            const maxTerms = Math.min(searchTerms.length, 3); // Process at most 3 search terms
            
            // Process search terms one by one
            for (let i = 0; i < maxTerms; i++) {
                const term = searchTerms[i];
                console.log(`[ScraperService] Searching for term (${i+1}/${maxTerms}): "${term}"`);
                
                try {
                    const startTime = Date.now();
                    // Search YouTube with the current term
                    const results = await youtube.search(term, {
                        searchType: 'video',
                        language: 'en-US'
                    });
                    const duration = Date.now() - startTime;
                    
                    console.log(`[ScraperService] Search completed in ${duration}ms, found ${results.videos.length} videos`);
                    
                    if (results.videos && results.videos.length > 0) {
                        // Log a sample of the results for debugging
                        console.log('[ScraperService] Sample video result:', JSON.stringify(results.videos[0], null, 2));
                        
                        // Convert videos to our article format
                        for (const video of results.videos) {
                            // Skip if video is missing essential data
                            if (!video.id || !video.title) {
                                console.log('[ScraperService] Skipping invalid video entry');
                                continue;
                            }
                            
                            // Skip duplicates
                            if (articles.some(a => a.url === video.link)) {
                                console.log('[ScraperService] Skipping duplicate video:', video.title);
                                continue;
                            }
                            
                            const article = {
                                title: video.title,
                                description: `Channel: ${video.channel?.name || 'Unknown Channel'}\n${video.description || ''}\nViews: ${video.views || 'Unknown'}`,
                                url: video.link,
                                imageUrl: video.thumbnail,
                                publishedAt: new Date(),
                                source: 'youtube',
                                type: 'video',
                                metadata: {
                                    id: video.id,
                                    channel: video.channel?.name,
                                    channelUrl: video.channel?.link,
                                    views: video.views,
                                    duration: video.duration,
                                    uploaded: video.uploaded
                                }
                            };
                            
                            articles.push(article);
                            
                            // Limit to 10 articles per term
                            if (articles.length >= (i + 1) * 10) {
                                break;
                            }
                        }
                    } else {
                        console.log(`[ScraperService] No videos found for term: "${term}"`);
                    }
                } catch (error) {
                    console.error(`[ScraperService] Error searching for term "${term}":`, error);
                }
            }
            
            console.log('[ScraperService] Total videos found:', articles.length);
            
            // If no articles were found, return empty array
            if (articles.length === 0) {
                console.log('[ScraperService] No videos found for any search term, returning empty array');
                return [];
            }
            
            return articles;
        } catch (error) {
            console.error('[ScraperService] Critical error in scrapeYouTube:', error);
            return []; // Return empty array on error
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
            console.log(`[ScraperService] Normalizing URL: ${url} with base ${baseUrl}`);
            const normalized = new URL(url, baseUrl).href;
            console.log(`[ScraperService] Normalized URL: ${normalized}`);
            return normalized;
        } catch (error) {
            console.warn("[ScraperService] Error normalizing URL:", error);
            return url;
        }
    }
    
    async scrapeWebsite(website) {
        console.log(`[ScraperService] Starting scrape for website: ${website.url}`);
        console.log(`[ScraperService] Website type: ${website.type}, Search terms: ${website.searchTerms}`);
        console.log(`[ScraperService] USE_MOCK_DATA flag is: ${global.USE_MOCK_DATA}`);
        
        if (global.USE_MOCK_DATA) {
            console.log('[ScraperService] Using mock data instead of real scraping');
            return this.generateMockYouTubeData(website);
        }
        
        try {
            console.log(`[ScraperService] Attempting real scrape for: ${website.url}`);
            
            // Add detailed logging for YouTube scraping
            if (website.type === 'video' && website.url.includes('youtube.com')) {
                console.log('[ScraperService] YouTube scraping detected');
                const results = await this.scrapeYouTube(website);
                console.log(`[ScraperService] YouTube scrape results: ${results ? results.length : 0} videos found`);
                return results;
            }
            
            // Your existing code follows here
            
        } catch (error) {
            console.error(`[ScraperService] Scraping error for ${website.url}:`, error);
            console.error(`[ScraperService] Error stack: ${error.stack}`);
            
            // Fallback to mock data on error
            console.log('[ScraperService] Falling back to mock data due to error');
            return this.generateMockYouTubeData(website);
        }
    }

    // Helper method to generate mock YouTube data when scraping fails
    generateMockYouTubeData(website) {
        console.log('[ScraperService] Generating mock YouTube data');

        // Extract search terms
        const searchTerms = (website.searchTerms || "technology news").split(',').map(term => term.trim()).filter(term => term);
        if (searchTerms.length === 0) {
            searchTerms.push("technology news");
        }

        // Generate mock articles based on the search terms
        const articles = [];

        // Create 5 mock articles for each search term
        for (const term of searchTerms) {
            // Generate sample videos for the current term
            for (let i = 1; i <= 5; i++) {
                const now = new Date();
                const publishDate = new Date(now.setDate(now.getDate() - i));
                const viewCount = Math.floor(Math.random() * 100000);
                const videoId = `mock${i}${Math.floor(Math.random() * 1000)}`;
                
                const article = {
                    title: `${term} - Latest Update #${i}`,
                    description: `Channel: ${term} Channel\nThis is a sample video about ${term}.\nViews: ${viewCount} views`,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    publishedAt: publishDate,
                    source: 'youtube',
                    type: 'video',
                    metadata: {
                        id: videoId,
                        channel: `${term} Channel`,
                        channelUrl: `https://www.youtube.com/channel/UC${videoId}`,
                        views: viewCount,
                        duration: Math.floor(Math.random() * 600) + 60, // Random duration between 1-10 minutes
                        uploaded: `${Math.floor(Math.random() * 12) + 1} months ago`
                    }
                };
                articles.push(article);
            }
        }

        console.log('[ScraperService] Generated', articles.length, 'mock YouTube articles');
        return articles;
    }
}

export default new ScraperService();