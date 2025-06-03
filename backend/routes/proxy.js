import express from 'express';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { errorHandler } from '../utils/error.js';

const router = express.Router();

// Set CORS headers
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Helper function to extract image ID from URL
const extractImageId = (url) => {
    // Try to extract from Grok share URL
    const grokMatch = url.match(/\/share\/([^\/]+)/);
    if (grokMatch) {
        return grokMatch[1];
    }

    // Try to extract from direct image URL
    const directMatch = url.split('/').pop();
    if (directMatch) {
        return directMatch;
    }

    return null;
};

// Helper function to try different image URL patterns
const tryImagePatterns = async (imageId) => {
    const patterns = [
        `https://pbs.twimg.com/media/${imageId}`,
        `https://pbs.twimg.com/media/${imageId}?format=jpg&name=large`,
        `https://pbs.twimg.com/media/${imageId}?format=png&name=large`,
        `https://pbs.twimg.com/media/${imageId}?format=webp&name=large`,
        `https://pbs.twimg.com/media/${imageId}?format=jpg&name=orig`,
        `https://pbs.twimg.com/media/${imageId}?format=png&name=orig`,
        `https://pbs.twimg.com/media/${imageId}?format=webp&name=orig`
    ];

    for (const pattern of patterns) {
        try {
            console.log('Attempting to fetch image from:', pattern);
            const response = await fetch(pattern, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://x.com/',
                    'Origin': 'https://x.com'
                }
            });

            if (response.ok) {
                const buffer = await response.buffer();
                const contentType = response.headers.get('content-type');
                console.log('Successfully fetched image from:', pattern);
                return { buffer, contentType };
            }
        } catch (error) {
            console.error('Error fetching image from pattern:', pattern, error);
            continue;
        }
    }
    return null;
};

// Helper function to fetch from share URL
const fetchFromShareUrl = async (url) => {
    try {
        console.log('Attempting to fetch from share URL:', url);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (!response.ok) return null;

        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Look for image URL in meta tags
        const metaImage = document.querySelector('meta[property="og:image"]');
        if (metaImage) {
            const imageUrl = metaImage.getAttribute('content');
            console.log('Found image URL in meta tags:', imageUrl);

            const imageResponse = await fetch(imageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://x.com/',
                    'Origin': 'https://x.com'
                }
            });

            if (imageResponse.ok) {
                const buffer = await imageResponse.buffer();
                const contentType = imageResponse.headers.get('content-type');
                return { buffer, contentType };
            }
        }

        // Look for image URL in HTML content
        const imgElements = document.querySelectorAll('img');
        for (const img of imgElements) {
            const src = img.getAttribute('src');
            if (src && (src.includes('grok') || src.includes('x.com'))) {
                console.log('Found potential image URL in page content:', src);
                try {
                    const imageResponse = await fetch(src, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Referer': 'https://x.com/',
                            'Origin': 'https://x.com'
                        }
                    });

                    if (imageResponse.ok) {
                        const buffer = await imageResponse.buffer();
                        const contentType = imageResponse.headers.get('content-type');
                        return { buffer, contentType };
                    }
                } catch (err) {
                    console.warn('Failed to fetch image from page content URL:', err.message);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching from share URL:', error);
    }
    return null;
};

// Proxy route for 4chan images
router.get('/image', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL parameter is required'
            });
        }

        // Validate URL is from 4chan
        if (!url.includes('i.4cdn.org')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image URL'
            });
        }

        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 10000,
            headers: {
                'Referer': 'https://boards.4channel.org/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Forward the content type
        res.setHeader('Content-Type', response.headers['content-type']);

        // Stream the image data
        response.data.pipe(res);
    } catch (error) {
        console.error('[Proxy] Error proxying image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to proxy image'
        });
    }
});

// 4chan image proxy endpoint
router.get('/4chan-image', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        console.log('Fetching 4chan image:', url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://boards.4channel.org/',
                'Origin': 'https://boards.4channel.org'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.buffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Set appropriate headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Send the image
        res.send(buffer);
    } catch (error) {
        console.error('4chan image proxy error:', error);
        res.status(500).json({ 
            error: 'Error fetching image',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/link-preview', async (req, res) => {
    console.log('[Proxy] ===== LINK PREVIEW REQUEST START =====');
    console.log('[Proxy] Request method:', req.method);
    console.log('[Proxy] Request URL:', req.url);
    console.log('[Proxy] Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('[Proxy] Query parameters:', JSON.stringify(req.query, null, 2));
    console.log('[Proxy] Request timestamp:', new Date().toISOString());

    try {
        const { url } = req.query;

        if (!url) {
            console.error('[Proxy] ===== ERROR: NO URL PROVIDED =====');
            return res.status(400).json({ 
                error: 'URL parameter is required',
                timestamp: new Date().toISOString()
            });
        }

        console.log('[Proxy] Processing URL:', url);
        console.log('[Proxy] URL type:', typeof url);
        console.log('[Proxy] URL length:', url.length);

        // For Twitter/X URLs, use our Twitter embed endpoint
        const isTwitterUrl = url.match(/^https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/);
        console.log('[Proxy] Is Twitter URL?', !!isTwitterUrl);

        if (isTwitterUrl) {
            console.log('[Proxy] ===== PROCESSING TWITTER URL =====');
            console.log('[Proxy] Detected Twitter URL, forwarding to Twitter endpoint');
            
            try {
                // Make internal request to our Twitter endpoint
                const twitterEndpoint = `http://0.0.0.0:5000/api/twitter/embed?url=${encodeURIComponent(url)}`;
                console.log('[Proxy] Twitter endpoint URL:', twitterEndpoint);
                console.log('[Proxy] Making internal request...');

                const fetchStart = Date.now();
                const twitterResponse = await fetch(twitterEndpoint, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Internal-Proxy-Request'
                    },
                    timeout: 10000 // 10 second timeout
                });
                const fetchDuration = Date.now() - fetchStart;

                console.log('[Proxy] ===== TWITTER ENDPOINT RESPONSE =====');
                console.log('[Proxy] Response status:', twitterResponse.status);
                console.log('[Proxy] Response statusText:', twitterResponse.statusText);
                console.log('[Proxy] Response headers:', Object.fromEntries(twitterResponse.headers.entries()));
                console.log('[Proxy] Fetch duration:', fetchDuration, 'ms');

                if (!twitterResponse.ok) {
                    const errorText = await twitterResponse.text();
                    console.error('[Proxy] ===== TWITTER ENDPOINT ERROR =====');
                    console.error('[Proxy] Error status:', twitterResponse.status);
                    console.error('[Proxy] Error text:', errorText);
                    throw new Error(`Twitter endpoint failed: ${twitterResponse.status} ${errorText}`);
                }

                const twitterData = await twitterResponse.json();
                console.log('[Proxy] ===== TWITTER SUCCESS =====');
                console.log('[Proxy] Twitter data:', JSON.stringify(twitterData, null, 2));
                console.log('[Proxy] Returning Twitter data to client');

                return res.json({
                    ...twitterData,
                    timestamp: new Date().toISOString(),
                    method: 'twitter-proxy'
                });

            } catch (twitterError) {
                console.error('[Proxy] ===== TWITTER ENDPOINT FAILED =====');
                console.error('[Proxy] Twitter error type:', twitterError.constructor.name);
                console.error('[Proxy] Twitter error message:', twitterError.message);
                console.error('[Proxy] Twitter error stack:', twitterError.stack);
                console.log('[Proxy] Falling back to generic preview');
                
                // Don't throw here, fall through to generic preview
            }
        }

        console.log('[Proxy] Using generic link preview for non-Twitter URL or fallback');

        // Generic link preview for non-Twitter URLs
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        console.log('[Proxy] Generic fetch response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        console.log('[Proxy] Received HTML length:', html.length);

        // Extract basic metadata
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

        const preview = {
            url: url,
            title: titleMatch ? titleMatch[1].trim() : 'Link Preview',
            description: descMatch ? descMatch[1].trim() : '',
            image: imageMatch ? imageMatch[1] : null,
            html: `<div class="link-preview"><h3>${titleMatch ? titleMatch[1].trim() : 'Link Preview'}</h3><p>${descMatch ? descMatch[1].trim() : ''}</p></div>`
        };

        console.log('[Proxy] Generated preview data:', preview);
        res.json(preview);

    } catch (error) {
        console.error('[Proxy] Link preview error:', error);
        console.error('[Proxy] Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to generate link preview',
            details: error.message 
        });
    }
});

const proxyRoutes = router;
export default proxyRoutes;