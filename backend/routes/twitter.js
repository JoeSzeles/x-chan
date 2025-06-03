import express from 'express';
const router = express.Router();

router.get('/embed', async (req, res) => {
    try {
        const { url } = req.query;

        console.log('[Twitter API] Embed request for URL:', url);

        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Clean the URL and handle both twitter.com and x.com domains
        const cleanUrl = url.replace(/\?.*$/, '').replace('x.com', 'twitter.com');

        // Extract tweet ID from URL
        const tweetMatch = cleanUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
        if (!tweetMatch) {
            console.log('[Twitter API] Invalid Twitter URL format:', cleanUrl);
            return res.status(400).json({ error: 'Invalid Twitter URL format' });
        }

        const tweetId = tweetMatch[1];
        console.log('[Twitter API] Extracted tweet ID:', tweetId);

        // Use Twitter's oEmbed API with the cleaned URL
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(cleanUrl)}&theme=dark&dnt=true&omit_script=true`;

        console.log('[Twitter API] Fetching from oEmbed URL:', oembedUrl);

        const response = await fetch(oembedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)',
                'Accept': 'application/json',
            },
            timeout: 10000
        });

        if (!response.ok) {
            console.log('[Twitter API] oEmbed API error:', response.status, response.statusText);
            throw new Error(`Twitter oEmbed API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[Twitter API] oEmbed response received:', { 
            hasHtml: !!data.html, 
            author: data.author_name,
            type: data.type 
        });

        if (!data.html) {
            throw new Error('No HTML content received from Twitter API');
        }

        res.json({
            html: data.html,
            author_name: data.author_name,
            author_url: data.author_url,
            cache_age: data.cache_age,
            height: data.height,
            provider_name: data.provider_name,
            provider_url: data.provider_url,
            type: data.type,
            url: data.url,
            version: data.version,
            width: data.width,
            tweet_id: tweetId
        });

    } catch (error) {
        console.error('[Twitter API] Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch tweet data',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;