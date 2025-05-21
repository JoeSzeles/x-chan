import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import YouTube from '@yimura/scraper';

class ScraperService {
    constructor() {
        this.youtube = new YouTube.default();
    }

    async scrapeWebsite(website) {
        try {
            console.log('[ScraperService] Scraping website:', {
                url: website.url,
                type: website.type,
                searchTerms: website.searchTerms
            });

            // Handle YouTube videos differently
            if (website.type === 'video' && 
                (website.url.includes('youtube.com') || website.url.includes('youtu.be'))) {
                return await this.scrapeYouTube(website);
            }

            // Handle other websites with regular scraping
            const response = await fetch(website.url);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;

            // Select elements based on selector
            const elements = document.querySelectorAll(website.selector);

            console.log(`[ScraperService] Found ${elements.length} elements matching selector: ${website.selector}`);

            const articles = [];

            elements.forEach(element => {
                try {
                    // Extract basic info - customize this based on website structure
                    const link = element.querySelector('a');
                    const title = element.querySelector('h2, h3, .title') || link;
                    const description = element.querySelector('p, .description');
                    const image = element.querySelector('img');

                    if (!link || !link.href) return;

                    const url = new URL(link.href, website.url).href;

                    const article = {
                        title: title ? title.textContent.trim() : 'No title',
                        description: description ? description.textContent.trim() : 'No description',
                        url: url,
                        imageUrl: image ? image.src : null,
                        publishedAt: new Date(),
                        source: new URL(website.url).hostname
                    };

                    articles.push(article);
                } catch (error) {
                    console.error('[ScraperService] Error extracting article:', error);
                }
            });

            return articles;
        } catch (error) {
            console.error('[ScraperService] Error scraping website:', error);
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