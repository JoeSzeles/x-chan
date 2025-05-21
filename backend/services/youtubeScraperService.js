
import { Scraper } from '@yimura/scraper';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '..', 'cache');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Ensure cache and logs directories exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

class YouTubeScraperService {
  constructor() {
    // Create YouTube scraper instance with options
    this.youtube = new Scraper({
      fetchOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      }
    });
    
    this.logFile = path.join(LOGS_DIR, 'youtube-scraper.log');
    this.cacheFile = path.join(CACHE_DIR, 'youtube-results.json');
    this.cacheDuration = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  // Logging helper
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    console.log(`[YouTubeScraperService] ${message}`);
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error(`[YouTubeScraperService] Error writing to log: ${error.message}`);
    }
  }

  // Cache helper methods
  saveCache(searchTerm, results) {
    try {
      let cache = {};
      
      // Load existing cache if it exists
      if (fs.existsSync(this.cacheFile)) {
        const cacheContent = fs.readFileSync(this.cacheFile, 'utf8');
        try {
          cache = JSON.parse(cacheContent);
        } catch (e) {
          this.log(`Error parsing cache file: ${e.message}`, 'error');
          cache = {};
        }
      }
      
      // Add new results to cache with timestamp
      cache[searchTerm] = {
        timestamp: Date.now(),
        results
      };
      
      // Save updated cache
      fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
      this.log(`Cached results for term: ${searchTerm}`);
    } catch (error) {
      this.log(`Error saving cache: ${error.message}`, 'error');
    }
  }

  getCache(searchTerm) {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return null;
      }
      
      const cacheContent = fs.readFileSync(this.cacheFile, 'utf8');
      const cache = JSON.parse(cacheContent);
      
      if (!cache[searchTerm]) {
        return null;
      }
      
      const entry = cache[searchTerm];
      const now = Date.now();
      
      // Check if cache entry is still valid
      if (now - entry.timestamp > this.cacheDuration) {
        this.log(`Cache expired for term: ${searchTerm}`);
        return null;
      }
      
      this.log(`Using cached results for term: ${searchTerm}`);
      return entry.results;
    } catch (error) {
      this.log(`Error reading cache: ${error.message}`, 'error');
      return null;
    }
  }

  // Main scraping method
  async scrapeYouTube(searchTerm) {
    this.log(`Scraping YouTube for term: ${searchTerm}`);
    
    // Check cache first
    const cachedResults = this.getCache(searchTerm);
    if (cachedResults) {
      return this.formatResults(cachedResults, searchTerm);
    }
    
    try {
      // Search YouTube
      this.log(`Performing search for: ${searchTerm}`);
      const searchResults = await this.youtube.search(searchTerm, { 
        limit: 15,  // Get 15 results
        type: 'video' // Only get videos, not playlists or channels
      });
      
      if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
        this.log(`No videos found for term: ${searchTerm}`, 'warn');
        return [];
      }
      
      this.log(`Found ${searchResults.videos.length} videos for term: ${searchTerm}`);
      
      // Cache the results
      this.saveCache(searchTerm, searchResults.videos);
      
      // Format and return the results
      return this.formatResults(searchResults.videos, searchTerm);
    } catch (error) {
      this.log(`Error scraping YouTube: ${error.message}`, 'error');
      this.log(`Stack trace: ${error.stack}`, 'error');
      return [];
    }
  }

  // Format the results to match the expected article structure
  formatResults(videos, searchTerm) {
    return videos.map((video, index) => {
      // Generate a recent publish date (within the last month)
      const now = new Date();
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      const publishDate = new Date(now.setDate(now.getDate() - daysAgo));
      
      return {
        title: video.title || `${searchTerm} video #${index + 1}`,
        description: `Channel: ${video.channel?.name || 'YouTube Channel'}\nViews: ${video.views || 'Unknown views'}`,
        url: video.link || `https://www.youtube.com/watch?v=${video.id}`,
        imageUrl: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        publishedAt: publishDate,
        source: 'youtube',
        type: 'video',
        metadata: {
          videoId: video.id,
          channelName: video.channel?.name || 'YouTube Channel',
          viewCount: video.views || 'Unknown',
          publishDate: publishDate.toISOString(),
          duration: video.duration || 'Unknown'
        }
      };
    });
  }

  // Method for external services to use
  async getYouTubeVideos(website) {
    if (global.USE_MOCK_DATA) {
      this.log('Using mock data instead of real scraping');
      return this.generateMockData(website);
    }
    
    this.log(`Getting YouTube videos for website: ${JSON.stringify(website)}`);
    
    // Extract search terms from website config
    const searchTerms = (website.searchTerms || "technology news")
      .split(',')
      .map(term => term.trim())
      .filter(term => term);
    
    if (searchTerms.length === 0) {
      searchTerms.push("technology news");
    }
    
    this.log(`Processing search terms: ${searchTerms.join(', ')}`);
    
    // Get videos for each search term (limited to first 3 terms)
    const allVideos = [];
    for (let i = 0; i < Math.min(searchTerms.length, 3); i++) {
      const term = searchTerms[i];
      try {
        const videos = await this.scrapeYouTube(term);
        
        // Add non-duplicate videos to results
        for (const video of videos) {
          if (!allVideos.some(v => v.url === video.url)) {
            allVideos.push(video);
          }
        }
        
        this.log(`Added ${videos.length} videos for term: ${term}`);
      } catch (error) {
        this.log(`Error processing term "${term}": ${error.message}`, 'error');
      }
    }
    
    this.log(`Total unique videos found: ${allVideos.length}`);
    return allVideos;
  }

  // Generate mock data when real scraping is disabled
  generateMockData(website) {
    this.log('Generating mock YouTube data');
    
    // Extract search terms
    const searchTerms = (website.searchTerms || "technology news")
      .split(',')
      .map(term => term.trim())
      .filter(term => term);
    
    if (searchTerms.length === 0) {
      searchTerms.push("technology news");
    }
    
    // Generate mock articles based on the search terms
    const articles = [];
    const topics = [
      "Latest Updates", "Tutorial", "Review", "News Report", 
      "Analysis", "Comparison", "How-To Guide", "Interview"
    ];
    
    // Generate a consistent video ID based on the term and index
    const generateVideoId = (term, index) => {
      const baseStr = `${term}${index}`.replace(/\s+/g, '');
      const hash = Array.from(baseStr).reduce(
        (acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0
      );
      return Math.abs(hash).toString(16).substring(0, 11);
    };
    
    // Create 5 mock articles for each search term
    for (const term of searchTerms) {
      for (let i = 1; i <= 5; i++) {
        const now = new Date();
        const publishDate = new Date(now.setDate(now.getDate() - i));
        const videoId = generateVideoId(term, i);
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const viewCount = Math.floor(Math.random() * 900000) + 100000;
        
        const article = {
          title: `${term} - ${topic} #${i}`,
          description: `Channel: ${term.charAt(0).toUpperCase() + term.slice(1)} Channel\nViews: ${viewCount.toLocaleString()} views`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          publishedAt: publishDate,
          source: 'youtube',
          type: 'video',
          metadata: {
            videoId: videoId,
            channelName: `${term.charAt(0).toUpperCase() + term.slice(1)} Channel`,
            viewCount: viewCount,
            publishDate: publishDate.toISOString()
          }
        };
        articles.push(article);
      }
    }
    
    this.log(`Generated ${articles.length} mock YouTube articles`);
    return articles;
  }
}

export default new YouTubeScraperService();
