# Bot System Implementation Guide

## Overview
The bot system is designed to automatically fetch, filter, and post content from various sources (currently YouTube) to a social media feed. The system is modular and can be extended to support other content sources.

## Architecture

### 1. Backend Components

#### Database Schema
```javascript
// Bot Schema
{
  name: String,              // Bot name
  owner: ObjectId,           // User who created the bot
  websites: [{              // Array of websites to monitor
    url: String,            // Website URL
    type: String,           // Content type (video, article, etc.)
    selector: String,       // CSS selector for content
    searchTerms: String,    // Comma-separated search terms
    active: Boolean         // Whether this source is active
  }],
  settings: {
    maxArticlesPerUpdate: Number,
    filterKeywords: [String],
    excludeKeywords: [String],
    language: String,
    autoPost: Boolean
  },
  stats: {
    totalArticles: Number,
    errorCount: Number,
    newArticles: Number,
    postedArticles: Number
  },
  updateInterval: Number,    // Minutes between updates
  status: String,           // active/inactive
  lastUpdate: Date
}

// Article Schema
{
  bot: ObjectId,            // Reference to bot
  title: String,
  description: String,
  url: String,
  imageUrl: String,
  publishedAt: Date,
  source: String,           // youtube, etc.
  engagement: {             // Engagement metrics
    views: Number,
    likes: Number,
    comments: Number
  }
}
```

#### API Routes
```javascript
// Bot Management
POST /api/newsbot              // Create new bot
GET /api/newsbot/user          // Get user's bots
GET /api/newsbot/:botId        // Get specific bot
PUT /api/newsbot/:botId        // Update bot
DELETE /api/newsbot/:botId     // Delete bot

// Article Management
GET /api/newsbot/:botId/articles  // Get bot's articles
POST /api/newsbot/:botId/post-article  // Post specific article
```

### 2. Frontend Components

#### BotArticles Component
The main component for displaying and managing bot content.

```javascript
// Key Features
- Article fetching and pagination
- YouTube video handling
- Post creation interface
- Error handling and loading states
```

#### YouTube Integration
```javascript
// URL Handling Functions
getYouTubeEmbedUrl(url)      // Convert to embed URL
getYouTubeThumbnail(url)     // Get video thumbnail
isYouTubeUrl(url)           // Validate YouTube URL
getCleanYouTubeUrl(url)     // Standardize URL format
```

### 3. Content Processing Pipeline

1. **Content Fetching**
   - Bot periodically checks configured websites
   - Uses CSS selectors to find relevant content
   - Extracts metadata (title, description, URL)

2. **Content Filtering**
   - Applies keyword filters
   - Checks for duplicates
   - Validates content format

3. **Content Storage**
   - Saves valid articles to database
   - Updates bot statistics
   - Maintains article history

4. **Content Posting**
   - Manual posting through UI
   - Optional auto-posting
   - Handles different content types (video, article)

## Implementation Steps

### 1. Backend Setup

1. **Create Bot Model**
```javascript
// models/bot.model.js
const botSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  websites: [{
    url: String,
    type: String,
    selector: String,
    searchTerms: String,
    active: Boolean
  }],
  // ... other fields
});
```

2. **Create Bot Controller**
```javascript
// controllers/newsBot.controller.js
export const createBot = async (req, res) => {
  try {
    const bot = await Bot.create({
      ...req.body,
      owner: req.user._id
    });
    res.status(201).json({ success: true, data: bot });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
```

3. **Implement Content Fetcher**
```javascript
// services/contentFetcher.js
export const fetchContent = async (website) => {
  const response = await axios.get(website.url);
  const $ = cheerio.load(response.data);
  const content = $(website.selector);
  // Process content...
  return processedContent;
};
```

### 2. Frontend Setup

1. **Create BotArticles Component**
```javascript
// components/news/BotArticles.jsx
const BotArticles = ({ botId, isOpen, onClose }) => {
  const [articles, setArticles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Fetch articles
  const { data, isLoading } = useQuery({
    queryKey: ["botArticles", botId, currentPage],
    queryFn: fetchArticles
  });
  
  // Handle posting
  const postToFeedMutation = useMutation({
    mutationFn: submitPost,
    onSuccess: handlePostSuccess
  });
  
  return (
    // Component JSX
  );
};
```

2. **Implement Post Creation**
```javascript
const handlePostSubmit = () => {
  const postData = {
    text: formattedContent,
    videoUrl: selectedArticle.url,
    title: selectedArticle.title,
    description: selectedArticle.description
  };
  postToFeedMutation.mutate(postData);
};
```

## Extending the System

### 1. Adding New Content Sources

1. **Create Source Handler**
```javascript
// services/sources/youtube.js
export const youtubeHandler = {
  validateUrl: (url) => isYouTubeUrl(url),
  getEmbedUrl: (url) => getYouTubeEmbedUrl(url),
  getThumbnail: (url) => getYouTubeThumbnail(url)
};
```

2. **Register Source**
```javascript
// services/contentFetcher.js
const sourceHandlers = {
  youtube: youtubeHandler,
  // Add new sources here
};
```

### 2. Adding New Features

1. **Auto-posting**
```javascript
// services/autoPoster.js
export const scheduleAutoPost = async (bot) => {
  if (!bot.settings.autoPost) return;
  
  const articles = await fetchNewArticles(bot);
  for (const article of articles) {
    await postArticle(article);
  }
};
```

2. **Content Analytics**
```javascript
// services/analytics.js
export const trackEngagement = async (article) => {
  const metrics = await fetchEngagementMetrics(article);
  await updateArticleStats(article._id, metrics);
};
```

## Best Practices

1. **Error Handling**
   - Implement comprehensive error handling
   - Log errors for debugging
   - Provide user-friendly error messages

2. **Performance**
   - Use pagination for large datasets
   - Implement caching where appropriate
   - Optimize database queries

3. **Security**
   - Validate all user inputs
   - Implement rate limiting
   - Use proper authentication

4. **Maintenance**
   - Regular content validation
   - Monitor bot performance
   - Update selectors as needed

## Common Issues and Solutions

1. **Content Fetching Failures**
   - Implement retry mechanism
   - Use proxy rotation
   - Handle rate limiting

2. **Duplicate Content**
   - Implement content hashing
   - Check URL patterns
   - Maintain content history

3. **API Limitations**
   - Implement rate limiting
   - Use caching
   - Handle API errors gracefully

## Future Improvements

1. **Content Sources**
   - Add support for more platforms
   - Implement RSS feed support
   - Add social media integration

2. **Features**
   - Advanced content filtering
   - AI-powered content selection
   - Automated engagement tracking

3. **Performance**
   - Implement WebSocket updates
   - Add real-time notifications
   - Optimize database queries

## Conclusion

The bot system provides a robust foundation for automated content aggregation and posting. By following this guide, you can implement similar functionality in other parts of your application or extend the current system with new features and content sources.

Remember to:
- Keep the code modular and maintainable
- Implement proper error handling
- Monitor system performance
- Regularly update content selectors
- Maintain security best practices 