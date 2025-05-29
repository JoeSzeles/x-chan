
import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import { handleImageUpload, validateImage } from "../utils/imageUpload.js";

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

// Upload image for messages
router.post("/message-image", protectRoute, handleImageUpload('image'), validateImage, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        // Upload to Cloudinary
        const uploadedResponse = await cloudinary.uploader.upload(req.file.path, {
            folder: "messages",
            resource_type: "auto",
            quality: "auto",
            fetch_format: "auto"
        });

        res.status(200).json({
            success: true,
            imageUrl: uploadedResponse.secure_url
        });
    } catch (error) {
        console.error("Error uploading message image:", error);
        res.status(500).json({ error: "Error uploading image" });
    }
});

export default router;
