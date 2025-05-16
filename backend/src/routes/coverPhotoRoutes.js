const express = require('express');
const router = express.Router();
const { protectRoute } = require('../middleware/protectRoute');
const {
    getCoverPhoto,
    updateCoverPhoto,
    getRecentContent
} = require('../controllers/coverPhotoController');

// Get user's cover photo
router.get('/:userId', getCoverPhoto);

// Update user's cover photo (protected route)
router.put('/update', protectRoute, updateCoverPhoto);

// Get user's recent content for cover photo
router.get('/recent/:userId', getRecentContent);

module.exports = router; 