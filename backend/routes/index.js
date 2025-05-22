
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Serve the frontend in production
router.get('*', (req, res) => {
    // If the request is for an API route, continue to the next handler
    if (req.url.startsWith('/api') || 
        req.url.startsWith('/uploads') || 
        req.url.startsWith('/public')) {
        return;
    }
    
    // Serve the static frontend files from the backend
    const frontendPath = path.resolve(__dirname, '../../frontend/dist');
    res.sendFile(path.join(frontendPath, 'index.html'));
});

export default router;
