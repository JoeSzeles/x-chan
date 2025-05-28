import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/user.model.js';
import MessageRequest from '../models/MessageRequest.js';

const router = express.Router();

console.log('[messages.js] ========================================');
console.log('[messages.js] INITIALIZING MESSAGES ROUTER');
console.log('[messages.js] ========================================');

// Simple test route - NO MIDDLEWARE
router.get('/test', (req, res) => {
    console.log('[messages.js] ✓ TEST route accessed successfully');
    res.json({ 
        success: true,
        message: 'Messages router is working!', 
        timestamp: new Date().toISOString(),
        path: req.path,
        originalUrl: req.originalUrl,
        method: req.method
    });
});

// Start conversation - DIRECT ROUTE FIRST
router.post('/start-conversation', protectRoute, async (req, res) => {
    console.log('[messages.js] ✓ POST /start-conversation - ROUTE ACCESSED');
    console.log('[messages.js] Request method:', req.method);
    console.log('[messages.js] Request path:', req.path);
    console.log('[messages.js] Request originalUrl:', req.originalUrl);
    console.log('[messages.js] Request body:', req.body);
    console.log('[messages.js] User:', req.user ? req.user._id : 'NO USER');

    try {
        const { userId } = req.body;

        if (!userId) {
            console.log('[messages.js] ❌ No userId provided');
            return res.status(400).json({ error: 'User ID is required' });
        }

        console.log('[messages.js] Looking for existing conversation...');

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, userId] }
        }).populate('participants', 'username fullName profileImg');

        if (conversation) {
            console.log('[messages.js] ✓ Found existing conversation:', conversation._id);
            return res.json(conversation);
        }

        console.log('[messages.js] Creating new conversation...');

        // Create new conversation
        conversation = new Conversation({
            participants: [req.user._id, userId]
        });

        await conversation.save();

        conversation = await Conversation.findById(conversation._id)
            .populate('participants', 'username fullName profileImg');

        console.log('[messages.js] ✓ Created new conversation:', conversation._id);
        res.status(201).json(conversation);

    } catch (error) {
        console.error('[messages.js] ❌ Error in start-conversation:', error);
        res.status(500).json({ error: 'Failed to start conversation', details: error.message });
    }
});

// Get all conversations for a user
router.get('/conversations', protectRoute, async (req, res) => {
    try {
        console.log(`[messages.js] Getting conversations for user: ${req.user._id}`);

        const conversations = await Conversation.find({
            participants: req.user._id
        })
        .populate('participants', 'username fullName profileImg')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        console.log(`[messages.js] Found ${conversations.length} conversations`);
        res.json(conversations);
    } catch (error) {
        console.error('[messages.js] Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get messages for a conversation (alternative route for compatibility)
router.get('/:conversationId', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        console.log(`[messages.js] Getting messages for conversation: ${conversationId}`);

        // Check if user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const messages = await Message.find({ conversationId: conversationId })
            .populate('senderId', 'username fullName profileImg')
            .sort({ createdAt: 1 });

        console.log(`[messages.js] Found ${messages.length} messages`);
        res.json(messages);
    } catch (error) {
        console.error('[messages.js] Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message (alternative route for compatibility)
router.post('/:conversationId', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;

        console.log(`[messages.js] Sending message to conversation: ${conversationId}`);

        // Check if user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const message = new Message({
            conversationId: conversationId,
            senderId: req.user._id,
            content
        });

        await message.save();

        // Update conversation's last message
        conversation.lastMessage = {
            content: content,
            senderId: req.user._id,
            timestamp: new Date()
        };
        conversation.lastActivity = new Date();
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'username fullName profileImg');

        console.log('[messages.js] Message sent successfully');
        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('[messages.js] Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        console.log(`[messages.js] Getting messages for conversation: ${conversationId}`);

        // Check if user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const messages = await Message.find({ conversationId: conversationId })
            .populate('senderId', 'username fullName profileImg')
            .sort({ createdAt: 1 });

        console.log(`[messages.js] Found ${messages.length} messages`);
        res.json(messages);
    } catch (error) {
        console.error('[messages.js] Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
router.post('/conversations/:conversationId/messages', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;

        console.log(`[messages.js] Sending message to conversation: ${conversationId}`);

        // Check if user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const message = new Message({
            conversationId: conversationId,
            senderId: req.user._id,
            content
        });

        await message.save();

        // Update conversation's last message
        conversation.lastMessage = {
            content: content,
            senderId: req.user._id,
            timestamp: new Date()
        };
        conversation.lastActivity = new Date();
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'username fullName profileImg');

        console.log('[messages.js] Message sent successfully');
        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('[messages.js] Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

console.log('[messages.js] ========================================');
console.log('[messages.js] ALL ROUTES REGISTERED SUCCESSFULLY');
console.log('[messages.js] Available routes:');
console.log('[messages.js] - GET  /test');
console.log('[messages.js] - POST /start-conversation');
console.log('[messages.js] - GET  /conversations');
console.log('[messages.js] - GET  /conversations/:id/messages');
console.log('[messages.js] - POST /conversations/:id/messages');
console.log('[messages.js] ========================================');

export default router;