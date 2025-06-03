import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

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

function isTwitterUrl(url) {
    try {
        return url.match(/^https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/);
    } catch (error) {
        return false;
    }
}

// Twitter embed endpoint
router.get('/embed', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        console.log('Processing Twitter URL:', url);

        // Validate Twitter URL
        if (!isTwitterUrl(url)) {
            return res.status(400).json({ error: 'Invalid Twitter URL' });
        }

        // Extract tweet ID and username
        const tweetId = extractTweetIdFromUrl(url);
        const username = extractUsernameFromUrl(url);

        if (!tweetId) {
            return res.status(400).json({ error: 'Could not extract tweet ID from URL' });
        }

        // Create a simple fallback embed
        const tweetData = {
            html: `
                <div class="tweet-fallback bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-3">
                        <svg class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span class="text-blue-300 font-medium">Tweet from @${username}</span>
                    </div>
                    <div class="flex gap-3 text-sm">
                        <a href="${url}" target="_blank" rel="noopener noreferrer" 
                           class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                            <span>🐦</span> View on Twitter
                        </a>
                    </div>
                    <div class="mt-2 text-xs text-gray-400">
                        Tweet ID: ${tweetId}
                    </div>
                </div>
            `,
            author_name: username,
            author_url: url.split('/status/')[0],
            tweet_id: tweetId,
            method: 'fallback'
        };
console.log('Returning tweet data');

        res.json({
            ...tweetData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Twitter embed error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch tweet data',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;