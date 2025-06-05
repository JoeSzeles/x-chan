import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

const router = express.Router();

// Configure Cloudinary
// Configuration is already done in server.js, no need to duplicate here
// This prevents configuration conflicts in different parts of the app

// Configure Cloudinary storage for board images
const boardStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'board_images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

// Configure Cloudinary storage for profile images
const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'profile_images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 400, height: 400, gravity: 'face', crop: 'fill', quality: 'auto' }]
    }
});

// Configure multer with different storages
const boardUpload = multer({ storage: boardStorage });
const profileUpload = multer({ storage: profileStorage });

// Upload image
router.post('/', protectRoute, boardUpload.single('file'), async (req, res) => {
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
router.post('/profile', protectRoute, profileUpload.single('profileImg'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image' });
        }

        // The image is already uploaded to Cloudinary via multer-storage-cloudinary
        // req.file.path contains the Cloudinary URL
        const imageUrl = req.file.path;

        // Update user's profile image in database
        const User = (await import('../models/user.model.js')).default;
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profileImg: imageUrl },
            { new: true }
        ).select('-password');

        res.status(200).json({ 
            success: true, 
            url: imageUrl,
            user: updatedUser
        });
    } catch (error) {
        console.error('Profile image upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 