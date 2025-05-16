import express from 'express';
import axios from 'axios';
import { JSDOM } from 'jsdom';

const router = express.Router();

// Cache for failed attempts and rate limiting
const failedAttempts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of failedAttempts.entries()) {
        if (now - value.timestamp > RATE_LIMIT_WINDOW) {
            failedAttempts.delete(key);
        }
    }
}, RATE_LIMIT_WINDOW);

// Proxy endpoint for Grok images
router.get('/image/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;
        
        // Check rate limit
        const now = Date.now();
        const key = `rate:${imageId}`;
        const rateData = failedAttempts.get(key) || { count: 0, timestamp: now };
        
        if (now - rateData.timestamp > RATE_LIMIT_WINDOW) {
            rateData.count = 1;
            rateData.timestamp = now;
        } else if (rateData.count >= MAX_REQUESTS_PER_WINDOW) {
            return res.status(429).json({
                error: 'Too many requests',
                details: 'Rate limit exceeded',
                retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - rateData.timestamp)) / 1000)
            });
        } else {
            rateData.count++;
        }
        failedAttempts.set(key, rateData);

        // Check if this ID has failed recently
        const failedKey = `failed:${imageId}`;
        const failedAttempt = failedAttempts.get(failedKey);
        if (failedAttempt && (now - failedAttempt.timestamp) < RATE_LIMIT_WINDOW) {
            return res.status(404).json({
                error: 'Image not found',
                details: 'Previous attempt failed recently',
                retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - failedAttempt.timestamp)) / 1000)
            });
        }

        // Try direct image URL patterns first
        const patterns = [
            `https://pbs.twimg.com/media/${imageId}?format=jpg&name=large`,
            `https://pbs.twimg.com/media/${imageId}?format=png&name=large`,
            `https://pbs.twimg.com/media/${imageId}?format=webp&name=large`
        ];

        for (const pattern of patterns) {
            try {
                const response = await axios.get(pattern, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://x.com/',
                        'Origin': 'https://x.com'
                    },
                    responseType: 'arraybuffer',
                    timeout: 5000
                });

                if (response.status === 200 && response.data) {
                    const contentType = response.headers['content-type'] || 'image/jpeg';
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Cache-Control', 'public, max-age=31536000');
                    return res.send(response.data);
                }
            } catch (err) {
                continue;
            }
        }

        // If direct patterns fail, try share URL
        const shareUrl = `https://x.com/i/grok/share/${imageId}`;
        try {
            const shareResponse = await axios.get(shareUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                timeout: 10000
            });

            const dom = new JSDOM(shareResponse.data);
            const document = dom.window.document;

            const metaImage = document.querySelector('meta[property="og:image"]');
            if (metaImage) {
                const imageUrl = metaImage.getAttribute('content');
                try {
                    const imageResponse = await axios.get(imageUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Referer': 'https://x.com/',
                            'Origin': 'https://x.com'
                        },
                        responseType: 'arraybuffer',
                        timeout: 5000
                    });

                    if (imageResponse.status === 200 && imageResponse.data) {
                        const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
                        res.setHeader('Content-Type', contentType);
                        res.setHeader('Cache-Control', 'public, max-age=31536000');
                        return res.send(imageResponse.data);
                    }
                } catch (err) {
                    // Continue to error handling
                }
            }
        } catch (err) {
            // Continue to error handling
        }

        // Record the failed attempt
        failedAttempts.set(failedKey, {
            timestamp: now,
            attempts: (failedAttempt?.attempts || 0) + 1
        });

        res.status(404).json({
            error: 'Image not found',
            details: 'No valid image URL could be found for the given ID',
            retryAfter: RATE_LIMIT_WINDOW / 1000
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch image',
            details: error.message,
            retryAfter: RATE_LIMIT_WINDOW / 1000
        });
    }
});

export default router; 