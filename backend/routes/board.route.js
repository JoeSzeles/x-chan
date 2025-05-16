import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import Board from '../models/board.model.js';
import User from '../models/user.model.js';
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

// Configure Cloudinary storage for board cover photos
const coverStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'board_covers',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 1500, height: 500, crop: 'fill' }],
        resource_type: 'auto'
    }
});

// Configure multer with Cloudinary storage
const upload = multer({ 
    storage: coverStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Create a new board
router.post('/create', protectRoute, async (req, res) => {
    try {
        // Check if user has reached the limit of 20 boards
        const userBoards = await Board.countDocuments({ creator: req.user.id });
        if (userBoards >= 20) {
            return res.status(400).json({ error: 'You have reached the maximum limit of 20 boards' });
        }

        // Transform image if provided
        let transformedImage = req.body.image;
        if (transformedImage) {
            try {
                // Extract public_id from Cloudinary URL
                const publicId = transformedImage.split('/').pop().split('.')[0];
                // Apply transformation to make it square and add rounded corners
                transformedImage = transformedImage.replace('/upload/', '/upload/c_fill,w_400,h_400,r_20/');
            } catch (error) {
                console.error('Error transforming image:', error);
                transformedImage = req.body.image;
            }
        }

        const newBoard = new Board({
            ...req.body,
            image: transformedImage,
            creator: req.user.id,
            admins: [req.user.id]
        });

        const savedBoard = await newBoard.save();
        
        // Populate the creator and followers fields
        const populatedBoard = await Board.findById(savedBoard._id)
            .populate('creator', 'username profilePicture')
            .populate('followers', '_id username profilePicture');

        res.status(201).json({
            success: true,
            board: populatedBoard
        });
    } catch (error) {
        console.error('Error creating board:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get all boards (with privacy filtering)
router.get('/', protectRoute, async (req, res) => {
    try {
        // Get user's followers
        const user = await User.findById(req.user.id).populate('followers');
        const followerIds = user.followers.map(f => f._id);

        // Get boards that are either:
        // 1. Public
        // 2. Created by the user
        // 3. Created by followers and set to 'followers' privacy
        // 4. Set to 'lists' privacy and user is in allowed lists
        const boards = await Board.find({
            $or: [
                { privacy: 'public' },
                { creator: req.user.id },
                {
                    $and: [
                        { privacy: 'followers' },
                        { creator: { $in: followerIds } }
                    ]
                },
                {
                    $and: [
                        { privacy: 'lists' },
                        { allowedLists: { $in: user.lists } }
                    ]
                }
            ]
        })
        .populate('creator', 'username profilePicture')
        .populate('followers', '_id username profilePicture')
        .sort({ createdAt: -1 });

        res.status(200).json(boards);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's boards
router.get('/user/:userId', protectRoute, async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Get boards owned by the user
        const ownedBoards = await Board.find({ creator: userId })
            .populate('creator', 'username profilePicture')
            .populate('followers', '_id username profilePicture')
            .sort({ createdAt: -1 });

        // Get boards that the user is following
        const followedBoards = await Board.find({ followers: userId })
            .populate('creator', 'username profilePicture')
            .populate('followers', '_id username profilePicture')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                owned: ownedBoards,
                followed: followedBoards
            }
        });
    } catch (error) {
        console.error('Error fetching user boards:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get boards that the user is following
router.get('/following', protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;
        console.log('Fetching following boards for user:', userId);
        
        // Find boards where the user is in the followers array
        const boards = await Board.find({
            followers: userId
        })
        .populate('creator', 'username profilePicture')
        .populate('followers', '_id username profilePicture')
        .sort({ createdAt: -1 });

        console.log('Found following boards:', boards.length, 'boards');
        console.log('Following boards details:', boards.map(b => ({
            name: b.name,
            followers: b.followers.map(f => f._id)
        })));
        
        if (!boards || boards.length === 0) {
            console.log('No following boards found for user:', userId);
            return res.status(200).json([]);
        }
        
        res.status(200).json(boards);
    } catch (error) {
        console.error('Error fetching following boards:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get board by name
router.get('/:name', async (req, res) => {
    try {
        const { name } = req.params;
        console.log('Fetching board:', name);
        
        const board = await Board.findOne({ name })
            .populate('creator', 'username profilePicture')
            .populate('followers', '_id username profilePicture')
            .populate({
                path: 'posts',
                populate: [
                    {
                        path: 'user',
                        select: 'username fullName profileImg'
                    },
                    {
                        path: 'comments.user',
                        select: 'username fullName profileImg'
                    }
                ],
                options: { sort: { createdAt: -1 } }
            });

        if (!board) {
            console.log('Board not found:', name);
            return res.status(404).json({ error: `Board not found: ${name}` });
        }

        console.log('Board found:', {
            id: board._id,
            name: board.name,
            coverPhoto: board.coverPhoto
        });

        res.status(200).json(board);
    } catch (error) {
        console.error('Error fetching board:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update board
router.put('/:identifier', protectRoute, async (req, res) => {
    try {
        const { identifier } = req.params;
        const { name, description, image, privacy, allowedLists } = req.body;

        // Find the board by either ID or name
        const board = await Board.findOne({
            $or: [
                { _id: identifier },
                { name: identifier }
            ]
        });

        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        // Check if user is authorized to edit
        if (board.creator.toString() !== req.user._id.toString() && !board.admins.includes(req.user._id)) {
            return res.status(403).json({ error: 'Not authorized to edit this board' });
        }

        // Check if name is being changed and if it's already taken
        if (name && name !== board.name) {
            const existingBoard = await Board.findOne({ name });
            if (existingBoard) {
                return res.status(400).json({ error: 'Board name already taken' });
            }
        }

        // Transform image if provided
        let transformedImage = image;
        if (image && image !== board.image) {
            try {
                // Extract public_id from Cloudinary URL
                const publicId = image.split('/').pop().split('.')[0];
                // Apply transformation to make it square and add rounded corners
                transformedImage = image.replace('/upload/', '/upload/c_fill,w_400,h_400,r_20/');
            } catch (error) {
                console.error('Error transforming image:', error);
                transformedImage = image;
            }
        }

        // Update board
        const updatedBoard = await Board.findByIdAndUpdate(
            board._id,
            {
                name: name || board.name,
                description: description || board.description,
                image: transformedImage || board.image,
                privacy: privacy || board.privacy,
                allowedLists: allowedLists || board.allowedLists,
                updatedAt: new Date()
            },
            { 
                new: true,
                runValidators: true
            }
        ).populate('creator', 'username profilePicture')
         .populate('followers', '_id username profilePicture')
         .populate({
            path: 'posts',
            populate: [
                {
                    path: 'user',
                    select: 'username fullName profileImg'
                },
                {
                    path: 'comments.user',
                    select: 'username fullName profileImg'
                }
            ],
            options: { sort: { createdAt: -1 } }
        });

        if (!updatedBoard) {
            throw new Error('Failed to update board');
        }

        // Convert to plain object and ensure image is included
        const boardData = updatedBoard.toObject();
        console.log('Board updated successfully:', {
            boardId: boardData._id,
            image: boardData.image,
            boardData
        });

        // Send response with both success flag and the complete board object
        const response = {
            success: true,
            board: boardData,
            image: transformedImage
        };

        console.log('Sending response:', response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Error updating board:', error);
        res.status(500).json({ error: 'Error updating board' });
    }
});

// Delete board
router.delete('/:boardId', protectRoute, async (req, res) => {
    try {
        const board = await Board.findById(req.params.boardId);
        
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        // Check if user is the creator or an admin
        if (board.creator.toString() !== req.user._id.toString() && !board.admins.includes(req.user._id)) {
            return res.status(403).json({ error: 'Not authorized to delete this board' });
        }

        // Delete the board
        await Board.findByIdAndDelete(req.params.boardId);
        
        res.status(200).json({ message: 'Board deleted successfully' });
    } catch (error) {
        console.error('Error deleting board:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add/Remove admin
router.put('/:boardName/admin/:userId', protectRoute, async (req, res) => {
    try {
        const board = await Board.findOne({ name: req.params.boardName });
        
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        if (board.creator.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Only the creator can manage admins' });
        }

        const { action } = req.body; // 'add' or 'remove'
        const userId = req.params.userId;

        if (action === 'add') {
            board.admins.push(userId);
        } else if (action === 'remove') {
            board.admins = board.admins.filter(id => id.toString() !== userId);
        }

        await board.save();
        res.status(200).json(board);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ban/Unban user
router.put('/:boardName/ban/:userId', protectRoute, async (req, res) => {
    try {
        const board = await Board.findOne({ name: req.params.boardName });
        
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        if (board.creator.toString() !== req.user.id && !board.admins.includes(req.user.id)) {
            return res.status(403).json({ error: 'You are not authorized to ban users' });
        }

        const { action } = req.body; // 'ban' or 'unban'
        const userId = req.params.userId;

        if (action === 'ban') {
            board.bannedUsers.push(userId);
        } else if (action === 'unban') {
            board.bannedUsers = board.bannedUsers.filter(id => id.toString() !== userId);
        }

        await board.save();
        res.status(200).json(board);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update board privacy and allowed lists
router.put('/:boardName/privacy', protectRoute, async (req, res) => {
    try {
        const board = await Board.findOne({ name: req.params.boardName });
        
        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        if (board.creator.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Only the creator can update privacy settings' });
        }

        const { privacy, allowedLists } = req.body;

        if (privacy === 'lists' && (!allowedLists || allowedLists.length === 0)) {
            return res.status(400).json({ error: 'Please select at least one list for list-only privacy' });
        }

        board.privacy = privacy;
        if (privacy === 'lists') {
            board.allowedLists = allowedLists;
        } else {
            board.allowedLists = [];
        }

        await board.save();
        res.status(200).json(board);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Follow/Unfollow board
router.put('/:boardId/follow', protectRoute, async (req, res) => {
    try {
        const { boardId } = req.params;
        console.log('Follow/unfollow request for board:', boardId, 'by user:', req.user._id);
        
        const board = await Board.findById(boardId);
        if (!board) {
            console.log('Board not found:', boardId);
            return res.status(404).json({ error: 'Board not found' });
        }

        const isFollowing = board.followers.includes(req.user._id);
        console.log('Current following status:', isFollowing);
        
        if (isFollowing) {
            // Unfollow
            board.followers = board.followers.filter(id => id.toString() !== req.user._id.toString());
        } else {
            // Follow
            board.followers.push(req.user._id);
        }

        await board.save();
        console.log('Updated board followers:', board.followers);
        
        res.json({ 
            message: isFollowing ? 'Unfollowed board' : 'Following board',
            isFollowing: !isFollowing,
            board: await Board.findById(boardId)
                .populate('creator', 'username profilePicture')
                .populate('followers', '_id username profilePicture')
        });
    } catch (error) {
        console.error('Error following/unfollowing board:', error);
        res.status(500).json({ error: 'Error following/unfollowing board' });
    }
});

// Update board cover photo
router.put('/:boardName/cover', protectRoute, upload.single('coverPhoto'), async (req, res) => {
    try {
        console.log('Cover photo upload request received:', {
            boardName: req.params.boardName,
            file: req.file,
            user: req.user._id
        });

        const board = await Board.findOne({ name: req.params.boardName });
        
        if (!board) {
            console.log('Board not found:', req.params.boardName);
            return res.status(404).json({ error: 'Board not found' });
        }

        // Check if user is authorized to edit
        if (board.creator.toString() !== req.user._id.toString() && !board.admins.includes(req.user._id)) {
            console.log('User not authorized:', {
                userId: req.user._id,
                creatorId: board.creator,
                isAdmin: board.admins.includes(req.user._id)
            });
            return res.status(403).json({ error: 'Not authorized to edit this board' });
        }

        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File uploaded successfully:', {
            path: req.file.path,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        // Delete old cover photo if exists
        if (board.coverPhoto) {
            try {
                const publicId = board.coverPhoto.split('/').pop().split('.')[0];
                console.log('Deleting old cover photo:', publicId);
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.error('Error deleting old cover photo:', error);
                // Continue with the update even if deletion fails
            }
        }

        // Get the secure URL from Cloudinary
        const secureUrl = req.file.path.replace('http://', 'https://');
        console.log('Secure URL for cover photo:', secureUrl);

        // Update board's cover photo
        board.coverPhoto = secureUrl;
        board.updatedAt = new Date();
        await board.save();

        // Fetch the updated board with populated fields
        const updatedBoard = await Board.findById(board._id)
            .populate('creator', 'username profilePicture')
            .populate('followers', '_id username profilePicture')
            .populate({
                path: 'posts',
                populate: [
                    {
                        path: 'user',
                        select: 'username fullName profileImg'
                    },
                    {
                        path: 'comments.user',
                        select: 'username fullName profileImg'
                    }
                ],
                options: { sort: { createdAt: -1 } }
            });

        if (!updatedBoard) {
            throw new Error('Failed to update board');
        }

        // Convert to plain object and ensure coverPhoto is included
        const boardData = updatedBoard.toObject();
        console.log('Board updated successfully:', {
            boardId: boardData._id,
            coverPhoto: boardData.coverPhoto,
            boardData
        });

        // Send response with both success flag and the complete board object
        const response = {
            success: true,
            board: boardData,
            coverPhoto: secureUrl
        };

        console.log('Sending response:', response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Error updating board cover photo:', error);
        // If we have a file uploaded but the update failed, try to delete it
        if (req.file) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (deleteError) {
                console.error('Error cleaning up uploaded file:', deleteError);
            }
        }
        res.status(500).json({ 
            error: 'Failed to update cover photo',
            details: error.message 
        });
    }
});

export default router; 