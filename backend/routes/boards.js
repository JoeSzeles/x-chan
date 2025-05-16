const express = require('express');
const router = express.Router();
const Board = require('../models/Board');
const ThreadComment = require('../models/ThreadComment');
const auth = require('../middleware/auth');

// Get board by name
router.get('/:boardName', auth, async (req, res) => {
    try {
        const { boardName } = req.params;
        
        const board = await Board.findOne({ name: boardName })
            .populate('creator', 'username profilePicture')
            .populate('admins', 'username profilePicture')
            .populate('followers', 'username profilePicture')
            .populate({
                path: 'posts',
                populate: [
                    {
                        path: 'author',
                        select: 'username profilePicture'
                    },
                    {
                        path: 'comments',
                        populate: [
                            {
                                path: 'author',
                                select: 'username profilePicture'
                            },
                            {
                                path: 'replies',
                                populate: {
                                    path: 'author',
                                    select: 'username profilePicture'
                                }
                            }
                        ]
                    }
                ]
            });

        if (!board) {
            return res.status(404).json({ error: 'Board not found' });
        }

        console.log('Sending board data:', board);
        res.json(board);
    } catch (error) {
        console.error('Error fetching board:', error);
        res.status(500).json({ error: 'Failed to fetch board' });
    }
});

// Increment view count
router.post('/:boardName/view', auth, async (req, res) => {
    try {
        const { boardName } = req.params;
        console.log('=== View Count Update Start ===');
        console.log('Board name:', boardName);
        console.log('User ID:', req.user._id);
        
        // First find the board to ensure it exists
        const existingBoard = await Board.findOne({ name: boardName });
        if (!existingBoard) {
            console.log('Board not found:', boardName);
            return res.status(404).json({ error: 'Board not found' });
        }

        console.log('Existing board:', {
            id: existingBoard._id,
            name: existingBoard.name,
            currentViews: existingBoard.views
        });
        
        // Update the view count
        const board = await Board.findOneAndUpdate(
            { name: boardName },
            { $inc: { views: 1 } },
            { new: true, runValidators: true }
        );

        console.log('Updated board:', {
            id: board._id,
            name: board.name,
            newViews: board.views
        });

        // Set proper headers
        res.setHeader('Content-Type', 'application/json');
        
        const response = { 
            views: board.views,
            message: 'View count updated successfully'
        };
        
        console.log('Sending response:', response);
        console.log('=== View Count Update End ===');
        
        return res.status(200).json(response);
    } catch (error) {
        console.error('=== View Count Update Error ===');
        console.error('Error details:', error);
        // Set proper headers for error response
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ 
            error: 'Failed to increment view count',
            details: error.message
        });
    }
});

// Add comment to a thread
router.post('/:boardName/thread/:threadId/comment', auth, async (req, res) => {
    try {
        const { boardName, threadId } = req.params;
        const { comment } = req.body;
        const userId = req.user._id;

        if (!comment || !comment.trim()) {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        const newComment = new ThreadComment({
            board: boardName,
            threadId,
            text: comment,
            author: userId
        });

        await newComment.save();

        // Populate author details before sending response
        await newComment.populate('author', 'username profilePicture');

        res.status(201).json(newComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Get comments for a thread
router.get('/:boardName/thread/:threadId/comments', auth, async (req, res) => {
    try {
        const { boardName, threadId } = req.params;

        const comments = await ThreadComment.find({
            board: boardName,
            threadId
        })
        .populate('author', 'username profilePicture')
        .sort({ createdAt: -1 });

        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

module.exports = router; 