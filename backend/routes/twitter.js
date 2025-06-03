import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Twitter oEmbed endpoint
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

        // First try to get the tweet data with all features enabled
        const response = await fetch(
            `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&theme=dark&dnt=true&omit_script=true&hide_media=false&hide_thread=false&maxwidth=550&cards=all`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        );

        if (!response.ok) {
            console.error('Twitter API response not OK:', response.status, response.statusText);
            
            // If the first attempt fails, try with minimal parameters
            const fallbackResponse = await fetch(
                `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&theme=dark&omit_script=true`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }
            );

            if (!fallbackResponse.ok) {
                throw new Error(`Twitter API error: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
            }

            const fallbackData = await fallbackResponse.json();
            console.log('Successfully fetched tweet data with fallback');
            return res.json(fallbackData);
        }

        const data = await response.json();
        console.log('Successfully fetched tweet data');

        // Extract media information from the HTML
        const mediaUrls = [];
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(data.html)) !== null) {
            const url = match[1];
            // Only include media images, not profile pictures or icons
            if (!url.includes('profile_images') && 
                !url.includes('emoji') && 
                !url.includes('avatar') &&
                !url.includes('twemoji') &&
                !url.includes('badge')) {
                mediaUrls.push(url);
            }
        }

        // Add media information to the response
        const enhancedData = {
            ...data,
            media: mediaUrls,
            author_url: data.author_url || url.split('/status/')[0],
            author_name: data.author_name || url.split('/')[3]
        };

        res.json(enhancedData);
    } catch (error) {
        console.error('Error fetching tweet:', error);
        res.status(500).json({ 
            error: 'Failed to fetch tweet data',
            details: error.message 
        });
    }
});

export default router; 