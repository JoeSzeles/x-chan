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
    try {
        const { url } = req.query;

        console.log('[Proxy] ===== LINK PREVIEW REQUEST =====');
        console.log('[Proxy] Request URL:', req.url);
        console.log('[Proxy] Request headers:', req.headers);
        console.log('[Proxy] URL parameter:', url);

        if (!url) {
            console.error('[Proxy] No URL parameter provided');
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        console.log('[Proxy] Generating link preview for:', url);

        // For Twitter/X URLs, use our Twitter embed endpoint
        if (url.match(/^https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/)) {
            console.log('[Proxy] Detected Twitter URL, forwarding to Twitter endpoint');
            try {
                // Make internal request to our Twitter endpoint
                const twitterEndpoint = `http://localhost:5000/api/twitter/embed?url=${encodeURIComponent(url)}`;
                console.log('[Proxy] Making internal request to:', twitterEndpoint);

                const twitterResponse = await fetch(twitterEndpoint);
                console.log('[Proxy] Twitter endpoint response status:', twitterResponse.status);

                if (!twitterResponse.ok) {
                    const errorText = await twitterResponse.text();
                    console.error('[Proxy] Twitter endpoint error response:', errorText);
                    throw new Error(`Twitter endpoint failed: ${twitterResponse.status} ${errorText}`);
                }

                const twitterData = await twitterResponse.json();
                console.log('[Proxy] Twitter endpoint response data:', twitterData);

                console.log('[Proxy] Successfully returning Twitter data');
                return res.json(twitterData);
            } catch (twitterError) {
                console.error('[Proxy] Twitter endpoint failed, falling back to generic preview:', twitterError);
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