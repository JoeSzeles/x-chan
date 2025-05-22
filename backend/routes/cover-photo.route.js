
import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { validateCoverPhotoData } from '../utils/validators.js';
import User from '../models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `cover-photo-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage, 
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Get user's cover photo
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId).select('coverPhoto coverImg');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        return res.status(200).json({
            success: true,
            type: user.coverPhoto?.type || 'image',
            content: user.coverPhoto?.content || user.coverImg || null,
            metadata: user.coverPhoto?.metadata || {}
        });
    } catch (error) {
        console.error('Error getting cover photo:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Update user's cover photo
router.put('/update', protectRoute, upload.single('coverImage'), async (req, res) => {
    try {
        console.log('Cover photo update request received:', {
            body: req.body,
            file: req.file,
            userId: req.user._id
        });

        // If file was uploaded, use the path
        const content = req.file 
            ? `/uploads/${req.file.filename}` 
            : req.body.content;

        const type = req.body.type || 'image';
        const metadata = req.body.metadata ? 
            (typeof req.body.metadata === 'string' ? 
                JSON.parse(req.body.metadata) : req.body.metadata) : 
            {};
            
        const userId = req.user._id;

        // Validate the request data
        if (!validateCoverPhotoData({ type, content, metadata })) {
            console.log('Invalid cover photo data');
            return res.status(400).json({ 
                success: false,
                error: 'Invalid cover photo data' 
            });
        }

        // Update User document
        const userUpdate = {
            coverPhoto: {
                type,
                content,
                metadata
            }
        };

        // Only update coverImg for image type
        if (type === 'image') {
            userUpdate.coverImg = content;
        }

        console.log('Updating user with:', userUpdate);
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: userUpdate },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            console.log('User not found');
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        console.log('User updated successfully');
        return res.status(200).json({
            success: true,
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating cover photo:', error);
        return res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

export default router;
