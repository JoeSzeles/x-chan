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
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).send('No image URL provided');
    }

    const response = await fetch(imageUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Image fetch failed with status ${response.status}`);
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', response.headers.get('content-type'));

    response.body.pipe(res);
  } catch (error) {
    console.error('Error proxying 4chan image:', error);
    res.status(500).send('Error fetching image');
  }
});

const proxyRoutes = router;
export default proxyRoutes;