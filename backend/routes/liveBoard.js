import express from 'express';
import LiveBoardPost from '../models/LiveBoardPost.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

// Get all public posts and posts where user is not blocked
router.get('/', protectRoute, async (req, res) => {
    try {
        const posts = await LiveBoardPost.find({
            $or: [
                { isPublic: true },
                { senderId: req.user._id }
            ],
            blockedUsers: { $ne: req.user._id }
        })
        .populate('senderId', 'username fullName profileImg')
        .sort({ createdAt: -1 })
        .limit(50);

        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new post
router.post('/', protectRoute, async (req, res) => {
    try {
        const { content, type, url, isPublic } = req.body;
        
        const newPost = new LiveBoardPost({
            content,
            type,
            url,
            senderId: req.user._id,
            isPublic: isPublic ?? true
        });

        await newPost.save();
        
        const populatedPost = await LiveBoardPost.findById(newPost._id)
            .populate('senderId', 'username fullName profileImg');

        res.status(201).json(populatedPost);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update post visibility or block users
router.patch('/:postId', protectRoute, async (req, res) => {
    try {
        const { isPublic, blockedUsers } = req.body;
        const post = await LiveBoardPost.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.senderId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to modify this post' });
        }

        if (isPublic !== undefined) {
            post.isPublic = isPublic;
        }

        if (blockedUsers) {
            post.blockedUsers = blockedUsers;
        }

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a post
router.delete('/:postId', protectRoute, async (req, res) => {
    try {
        const post = await LiveBoardPost.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.senderId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }

        await post.deleteOne();
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router; 