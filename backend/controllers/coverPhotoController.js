import { validateCoverPhotoData } from '../utils/validators.js';
import CoverPhoto from '../models/coverPhoto.model.js';
import User from '../models/user.model.js';

export const updateCoverPhoto = async (req, res) => {
    try {
        console.log('CoverPhotoController: Update request received:', {
            body: req.body,
            userId: req.user._id
        });

        const { type, content, metadata } = req.body;
        const userId = req.user._id;

        // Validate the request data
        if (!validateCoverPhotoData({ type, content, metadata })) {
            console.log('CoverPhotoController: Invalid cover photo data');
            return res.status(400).json({ 
                success: false,
                error: 'Invalid cover photo data' 
            });
        }

        // Prepare metadata with consistent format
        const metadataToSave = {
            ...(type === 'video' ? {
                videoId: content,
                source: 'youtube'
            } : {
                source: 'upload'
            }),
            ...metadata
        };

        // Update or create CoverPhoto document
        let coverPhoto = await CoverPhoto.findOneAndUpdate(
            { userId },
            {
                type,
                content,
                metadata: metadataToSave,
                updatedAt: Date.now()
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
        ).select('-password');

        if (!updatedUser) {
            console.log('CoverPhotoController: User not found');
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }

        console.log('CoverPhotoController: User updated successfully');
        return res.status(200).json({
            success: true,
            coverPhoto,
            user: updatedUser
        });
    } catch (error) {
        console.error('CoverPhotoController: Error updating cover photo:', error);
        return res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
}; 