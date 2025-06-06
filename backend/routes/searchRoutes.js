import express from 'express';
import { searchUsers, searchPosts } from '../controllers/searchController.js';

const router = express.Router();

router.get('/users', searchUsers);
router.get('/posts', searchPosts);


// Test endpoint to verify search is working
router.get('/test', async (req, res) => {
    try {
        const User = (await import('../models/user.model.js')).default;
        const userCount = await User.countDocuments();
        const sampleUsers = await User.find().select('username fullName').limit(3);
        
        res.json({
            success: true,
            message: 'Search service is working',
            userCount,
            sampleUsers
        });
    } catch (error) {
        console.error('Search test error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


export default router; 