import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { followUnfollowUser, getSuggestedUsers, getUserProfile, updateUser, getOnlineUsers, updateSettings, getFollowers, getFollowing } from "../controllers/user.controller.js";
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import User from "../models/user.model.js";

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

// Upload cover photo
router.post('/upload/cover', protectRoute, upload.single('coverImg'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Delete old cover photo if exists
        const user = await User.findById(req.user._id);
        if (user.coverImg) {
            try {
                const publicId = user.coverImg.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.error('Error deleting old cover photo:', error);
            }
        }

        // Update user's cover photo
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { 
                coverImg: req.file.path,
                coverPhoto: {
                    type: 'image',
                    content: req.file.path,
                    metadata: {
                        source: 'upload'
                    }
                }
            },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            success: true,
            coverImg: updatedUser.coverImg,
            coverPhoto: updatedUser.coverPhoto
        });
    } catch (error) {
        console.error('Error uploading cover photo:', error);
        res.status(500).json({ error: 'Failed to upload cover photo' });
    }
});

router.get("/profile/:username", protectRoute, getUserProfile);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.get("/online", protectRoute, getOnlineUsers);
router.get("/:username/followers", protectRoute, getFollowers);
router.get("/:username/following", protectRoute, getFollowing);
router.post("/follow/:id", protectRoute, followUnfollowUser);
router.post("/follow/username/:username", protectRoute, followUnfollowUser);
router.post('/upload/profile', protectRoute, upload.single('profileImg'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = await User.findById(req.user._id);
        if (user.profileImg) {
            try {
                const publicId = user.profileImg.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.error('Error deleting old profile picture:', error);
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profileImg: req.file.path },
            { new: true }
        ).select('-password');

        // Add proper error handling and response
        res.json({ 
            success: true, 
            user: updatedUser,
            message: 'Profile picture updated successfully' 
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
});

router.post("/update", protectRoute, updateUser);
router.put("/settings", protectRoute, updateSettings);

// Update message permissions  
router.put('/message-permissions', protectRoute, async (req, res) => {
  try {
    const { allowMessages } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { allowMessages },
      { new: true }
    );

    res.json({ allowMessages: user.allowMessages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message permissions' });
  }
});

export default router;
