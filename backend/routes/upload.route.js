import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

const router = express.Router();

// Configure Cloudinary
// Configuration is already done in server.js, no need to duplicate here
// This prevents configuration conflicts in different parts of the app

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
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Log the file details
        console.log('Uploaded file:', {
            url: req.file.path,
            public_id: req.file.filename,
            format: req.file.format
        });

        // Return the Cloudinary URL
        res.status(200).json({ url: req.file.path });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload profile image
router.post('/profile', protectRoute, upload.single('profileImg'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image' });
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "profile_images",
            transformation: [
                { width: 400, height: 400, gravity: "face", crop: "fill", quality: "auto" },
                { radius: "max" }
            ]
        });

        res.status(200).json({ success: true, url: result.secure_url });
    } catch (error) {
        console.error('Profile image upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 