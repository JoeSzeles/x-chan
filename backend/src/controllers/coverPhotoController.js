const CoverPhoto = require('../models/CoverPhoto');
const User = require('../models/User');
const Post = require('../models/Post');

// Get user's cover photo
exports.getCoverPhoto = async (req, res) => {
    try {
        console.log('Getting cover photo for user:', req.params.userId);
        const coverPhoto = await CoverPhoto.findOne({ userId: req.params.userId });
        if (!coverPhoto) {
            console.log('No cover photo found for user:', req.params.userId);
            return res.status(404).json({ error: 'Cover photo not found' });
        }
        console.log('Found cover photo:', coverPhoto);
        res.json(coverPhoto);
    } catch (error) {
        console.error('Error getting cover photo:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update user's cover photo
exports.updateCoverPhoto = async (req, res) => {
    try {
        console.log('CoverPhotoController: Update request received:', {
            body: req.body,
            userId: req.user._id
        });

        const { type, content, metadata } = req.body;
        const userId = req.user._id;

        // Validate the cover photo type and content
        if (!['image', 'video', 'content'].includes(type)) {
            console.log('CoverPhotoController: Invalid cover photo type:', type);
            return res.status(400).json({ error: 'Invalid cover photo type' });
        }

        if (!content) {
            console.log('CoverPhotoController: No content provided');
            return res.status(400).json({ error: 'Content is required' });
        }

        // Prepare metadata
        const metadataToSave = type === 'video' ? {
            videoId: content,
            source: 'youtube',
            ...metadata
        } : metadata;

        // Update or create CoverPhoto document
        let coverPhoto = await CoverPhoto.findOneAndUpdate(
            { userId },
            {
                type,
                content,
                metadata: metadataToSave
            },
            { upsert: true, new: true }
        );

        console.log('CoverPhotoController: Saved cover photo:', coverPhoto);

        // Update User document
        const userUpdate = {
            coverPhoto: {
                type,
                content,
                metadata: metadataToSave
            }
        };

        // Only update coverImg for image type
        if (type === 'image') {
            userUpdate.coverImg = content;
        }

        console.log('CoverPhotoController: Updating user with:', userUpdate);
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: userUpdate },
            { new: true }
        );

        if (!updatedUser) {
            console.error('CoverPhotoController: Failed to update user document');
            return res.status(500).json({ error: 'Failed to update user document' });
        }

        console.log('CoverPhotoController: User updated successfully:', {
            userId: updatedUser._id,
            coverPhoto: updatedUser.coverPhoto
        });

        // Return both the cover photo and user data
        res.json({
            coverPhoto,
            user: {
                _id: updatedUser._id,
                coverPhoto: updatedUser.coverPhoto,
                coverImg: updatedUser.coverImg
            }
        });
    } catch (error) {
        console.error('CoverPhotoController: Error updating cover photo:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get user's recent content for cover photo
exports.getRecentContent = async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('Getting recent content for user:', userId);
        
        // Get user's recent posts with media content
        const recentPosts = await Post.find({
            userId,
            $or: [
                { img: { $exists: true, $ne: null } },
                { 'text': { $regex: /(youtube\.com|youtu\.be)/i } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('text img createdAt');

        console.log('Found recent posts:', recentPosts.length);
        res.json(recentPosts);
    } catch (error) {
        console.error('Error getting recent content:', error);
        res.status(500).json({ error: error.message });
    }
}; 