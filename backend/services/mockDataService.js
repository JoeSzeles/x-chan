/**
 * Mock Data Service
 * Provides reliable mock data for development and testing
 */
class MockDataService {
  async generateMockYouTubeData(website) {
    console.log('[MockDataService] Generating YouTube mock data');

    try {
      // Use our specialized YouTube scraper service
      const { default: youtubeScraperService } = await import('./youtubeScraperService.js');
      const articles = await youtubeScraperService.getYouTubeVideos(website);
      console.log('[MockDataService] Generated', articles.length, 'YouTube articles via scraper service');
      return articles;
    } catch (error) {
      console.error('[MockDataService] Error using YouTube scraper service, falling back to simple mock data:', error.message);

      // Fallback implementation if scraper service fails
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

      console.log('[MockDataService] Generated', articles.length, 'fallback mock YouTube articles');
      return articles;
    }
  }
}