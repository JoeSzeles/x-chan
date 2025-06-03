import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Test endpoint for debugging
router.get('/test', (req, res) => {
    console.log('[Twitter] Test endpoint hit at:', new Date().toISOString());
    console.log('[Twitter] Request headers:', req.headers);
    console.log('[Twitter] Query params:', req.query);
    
    res.json({
        message: 'Twitter API is working',
        timestamp: new Date().toISOString(),
        headers: req.headers,
        query: req.query
    });
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

function isTwitterUrl(url) {
    try {
        return url.match(/^https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/);
    } catch (error) {
        return false;
    }
}

// Twitter embed endpoint
router.get('/embed', async (req, res) => {
    console.log('[Twitter] ===== TWITTER EMBED REQUEST START =====');
    console.log('[Twitter] Request method:', req.method);
    console.log('[Twitter] Request URL:', req.originalUrl);
    console.log('[Twitter] Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Twitter] Query parameters:', JSON.stringify(req.query, null, 2));
    console.log('[Twitter] Request timestamp:', new Date().toISOString());
    console.log('[Twitter] Request from IP:', req.ip || req.connection?.remoteAddress);

    // Set CORS headers immediately
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Content-Type', 'application/json');

    try {
        const { url } = req.query;

        console.log('[Twitter] ===== PROCESSING REQUEST =====');
        console.log('[Twitter] Raw query string:', req.url);
        console.log('[Twitter] Parsed URL parameter:', url);

        if (!url) {
            console.error('[Twitter] ===== ERROR: NO URL PARAMETER =====');
            return res.status(400).json({ 
                error: 'URL parameter is required',
                timestamp: new Date().toISOString(),
                received_query: req.query
            });
        }

        console.log('[Twitter] ===== URL VALIDATION =====');
        console.log('[Twitter] URL value:', url);
        console.log('[Twitter] URL type:', typeof url);
        console.log('[Twitter] URL length:', url.length);

        // Validate Twitter URL
        const isValidTwitterUrl = isTwitterUrl(url);
        console.log('[Twitter] isTwitterUrl result:', isValidTwitterUrl);

        if (!isValidTwitterUrl) {
            console.error('[Twitter] ===== INVALID TWITTER URL =====');
            console.error('[Twitter] URL does not match Twitter pattern:', url);
            return res.status(400).json({ 
                error: 'Invalid Twitter URL',
                provided_url: url,
                timestamp: new Date().toISOString()
            });
        }

        // Extract tweet ID and username
        const tweetId = extractTweetIdFromUrl(url);
        const username = extractUsernameFromUrl(url);

        console.log('[Twitter] ===== EXTRACTION RESULTS =====');
        console.log('[Twitter] Extracted tweet ID:', tweetId);
        console.log('[Twitter] Extracted username:', username);

        if (!tweetId) {
            console.error('[Twitter] ===== TWEET ID EXTRACTION FAILED =====');
            console.error('[Twitter] Could not extract tweet ID from URL:', url);
            return res.status(400).json({ 
                error: 'Could not extract tweet ID from URL',
                provided_url: url,
                timestamp: new Date().toISOString()
            });
        }

        // Create a rich Twitter embed
        const tweetData = {
            html: `
                <div class="twitter-embed-content">
                    <div class="flex items-start gap-3 p-4">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="font-semibold text-white">@${username}</span>
                                <span class="text-blue-400">•</span>
                                <span class="text-gray-400 text-sm">View on Twitter</span>
                            </div>
                            <div class="text-gray-300 mb-3">
                                Click to view this tweet on Twitter/X
                            </div>
                            <div class="flex items-center gap-4 text-gray-400 text-sm">
                                <span>Tweet ID: ${tweetId}</span>
                                <a href="${url}" target="_blank" rel="noopener noreferrer" 
                                   class="text-blue-400 hover:text-blue-300 transition-colors">
                                    View original →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            author_name: username,
            author_url: url.split('/status/')[0],
            tweet_id: tweetId,
            url: url,
            method: 'backend-fallback',
            title: `Tweet by @${username}`,
            description: 'Click to view this tweet on Twitter/X'
        };

        console.log('[Twitter] ===== SUCCESS =====');
        console.log('[Twitter] Generated tweet data keys:', Object.keys(tweetData));
        console.log('[Twitter] Tweet ID:', tweetData.tweet_id);
        console.log('[Twitter] Author:', tweetData.author_name);
        console.log('[Twitter] Returning response to client...');

        const response = {
            ...tweetData,
            timestamp: new Date().toISOString(),
            success: true
        };

        console.log('[Twitter] Final response:', JSON.stringify(response, null, 2));
        
        return res.status(200).json(response);

    } catch (error) {
        console.error('[Twitter] ===== CRITICAL ERROR =====');
        console.error('[Twitter] Error type:', error.constructor.name);
        console.error('[Twitter] Error message:', error.message);
        console.error('[Twitter] Error stack:', error.stack);
        
        return res.status(500).json({ 
            error: 'Failed to fetch tweet data',
            details: error.message,
            timestamp: new Date().toISOString(),
            success: false
        });
    }
});

export default router;