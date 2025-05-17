import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'board_images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

// Configure multer with Cloudinary storage
const upload = multer({ storage: storage });

// Upload image
router.post('/', protectRoute, upload.single('file'), async (req, res) => {
    try {
        console.log('Upload request received:', {
            headers: req.headers,
            body: req.body,
            file: req.file
        });

        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Log the file details
        console.log('File successfully uploaded to Cloudinary:', {
            url: req.file.path,
            public_id: req.file.filename,
            format: req.file.format,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        // Return the Cloudinary URL
        res.status(200).json({ url: req.file.path });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 