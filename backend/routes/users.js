import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import User from '../models/user.model.js';

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
        folder: 'cover_photos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 1500, height: 500, crop: 'fill' }]
    }
});

// Configure multer with Cloudinary storage
const upload = multer({ storage: storage });

// Update cover video
router.put('/cover-video', auth, async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        // Validate YouTube URL
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        if (!youtubeRegex.test(videoUrl)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Extract video ID
        const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube video ID' });
        }

        // Update user's cover video
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { 
                coverVideoUrl: videoUrl,
                coverPhoto: '' // Clear any existing cover photo
            },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        console.error('Error updating cover video:', error);
        res.status(500).json({ error: 'Failed to update cover video' });
    }
});

// Upload cover photo
router.post('/upload/cover', protectRoute, upload.single('coverImg'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Update user's cover photo
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { 
                coverImg: req.file.path,
                coverPhoto: '' // Clear any existing cover photo
            },
            { new: true }
        ).select('-password');

        res.json({ coverImg: user.coverImg });
    } catch (error) {
        console.error('Error uploading cover photo:', error);
        res.status(500).json({ error: 'Failed to upload cover photo' });
    }
}); 