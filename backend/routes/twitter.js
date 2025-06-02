import express from 'express';
import fetch from 'node-fetch';
import { getLinkPreview } from 'link-preview-js';
import { extract } from 'oembed-parser';

const router = express.Router();

// Twitter oEmbed endpoint with enhanced preview capabilities
router.get('/embed', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Validate URL format
        if (!url.match(/^https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/)) {
            return res.status(400).json({ error: 'Invalid Twitter URL' });
        }

        console.log('Fetching tweet data for URL:', url);

        let tweetData = null;
        let method = 'unknown';

        // Method 1: Try oEmbed parser first (most reliable)
        try {
            console.log('Trying oEmbed parser...');
            const oembedData = await extract(url);
            if (oembedData && oembedData.html) {
                tweetData = {
                    html: oembedData.html,
                    author_name: oembedData.author_name,
                    author_url: oembedData.author_url,
                    provider_name: oembedData.provider_name,
                    provider_url: oembedData.provider_url,
                    title: oembedData.title,
                    type: oembedData.type,
                    version: oembedData.version,
                    width: oembedData.width,
                    height: oembedData.height,
                    cache_age: oembedData.cache_age
                };
                method = 'oembed-parser';
                console.log('Successfully fetched with oEmbed parser');
            }
        } catch (oembedError) {
            console.log('oEmbed parser failed:', oembedError.message);
        }

        // Method 2: Try link preview if oEmbed failed
        if (!tweetData) {
            try {
                console.log('Trying link preview...');
                const previewData = await getLinkPreview(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 10000,
                    followRedirects: 'follow'
                });

                if (previewData) {
                    // Create a simplified HTML structure for the preview
                    const html = `
                        <div class="tweet-preview">
                            <div class="tweet-header">
                                <img src="${previewData.favicons?.[0] || ''}" alt="Twitter" class="tweet-icon">
                                <span class="tweet-site">${previewData.siteName || 'Twitter'}</span>
                            </div>
                            <div class="tweet-content">
                                <h3 class="tweet-title">${previewData.title || ''}</h3>
                                <p class="tweet-description">${previewData.description || ''}</p>
                                ${previewData.images?.[0] ? `<img src="${previewData.images[0]}" alt="Tweet media" class="tweet-media">` : ''}
                            </div>
                        </div>
                    `;

                    tweetData = {
                        html: html,
                        author_name: extractUsernameFromUrl(url),
                        author_url: url.split('/status/')[0],
                        title: previewData.title,
                        description: previewData.description,
                        images: previewData.images || [],
                        siteName: previewData.siteName,
                        url: previewData.url
                    };
                    method = 'link-preview';
                    console.log('Successfully fetched with link preview');
                }
            } catch (previewError) {
                console.log('Link preview failed:', previewError.message);
            }
        }

        // Method 3: Fallback to original Twitter oEmbed API
        if (!tweetData) {
            try {
                console.log('Trying Twitter oEmbed API...');
                const response = await fetch(
                    `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&theme=dark&dnt=true&omit_script=true&hide_media=false&hide_thread=false&maxwidth=550&cards=all`,
                    {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        timeout: 10000
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    tweetData = data;
                    method = 'twitter-oembed';
                    console.log('Successfully fetched with Twitter oEmbed');
                } else {
                    throw new Error(`Twitter API error: ${response.status}`);
                }
            } catch (twitterError) {
                console.log('Twitter oEmbed failed:', twitterError.message);
            }
        }

        // If all methods failed, create a minimal fallback
        if (!tweetData) {
            console.log('All methods failed, creating fallback');
            const username = extractUsernameFromUrl(url);
            tweetData = {
                html: `
                    <div class="tweet-fallback">
                        <div class="tweet-header">
                            <span class="tweet-icon">🐦</span>
                            <span class="tweet-author">@${username}</span>
                        </div>
                        <div class="tweet-content">
                            <p>Unable to load tweet content</p>
                            <a href="${url}" target="_blank" rel="noopener noreferrer">View on Twitter</a>
                        </div>
                    </div>
                `,
                author_name: username,
                author_url: url.split('/status/')[0],
                error: 'Unable to fetch tweet content',
                fallback: true
            };
            method = 'fallback';
        }

        // Extract media information from HTML if available
        const mediaUrls = [];
        if (tweetData.html) {
            const imgRegex = /<img[^>]+src="([^">]+)"/g;
            let match;
            while ((match = imgRegex.exec(tweetData.html)) !== null) {
                const imgUrl = match[1];
                // Only include media images, not profile pictures or icons
                if (!imgUrl.includes('profile_images') && 
                    !imgUrl.includes('emoji') && 
                    !imgUrl.includes('avatar') &&
                    !imgUrl.includes('twemoji') &&
                    !imgUrl.includes('badge') &&
                    !imgUrl.includes('favicon')) {
                    mediaUrls.push(imgUrl);
                }
            }
        }

        // Enhanced response with additional metadata
        const enhancedData = {
            ...tweetData,
            media: mediaUrls,
            author_url: tweetData.author_url || url.split('/status/')[0],
            author_name: tweetData.author_name || extractUsernameFromUrl(url),
            method: method,
            timestamp: new Date().toISOString(),
            tweet_id: extractTweetIdFromUrl(url)
        };

        res.json(enhancedData);
    } catch (error) {
        console.error('Error fetching tweet:', error);
        res.status(500).json({ 
            error: 'Failed to fetch tweet data',
            details: error.message,
            method: 'error'
        });
    }
});

// Helper function to extract username from Twitter URL
function extractUsernameFromUrl(url) {
    try {
        const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/);
        return match ? match[1] : 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

// Helper function to extract tweet ID from Twitter URL
function extractTweetIdFromUrl(url) {
    try {
        const match = url.match(/status\/(\d+)/);
        return match ? match[1] : null;
    } catch (error) {
        return null;
    }
}

export default router; 