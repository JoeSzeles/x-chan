
import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import MessageRequest from '../models/MessageRequest.js';
import User from '../models/user.model.js';

const router = express.Router();

console.log('[messages.js] Router initialized and ready');

// Test route to verify router is working
router.get('/test', (req, res) => {
    console.log('[messages.js] TEST route hit successfully!');
    res.json({ 
        message: 'Messages router is working!', 
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    });
});

// Debug middleware to log all requests to this router
router.use((req, res, next) => {
    console.log(`[messages.js] MIDDLEWARE: ${req.method} ${req.originalUrl} - Body:`, req.body);
    console.log(`[messages.js] User:`, req.user ? req.user._id : 'No user');
    next();
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

// Start conversation with a specific user - THIS IS THE ENDPOINT THAT'S FAILING
router.post('/start-conversation', protectRoute, async (req, res) => {
    try {
        console.log('[messages.js] POST /start-conversation endpoint hit');
        console.log('[messages.js] Request body:', req.body);
        console.log('[messages.js] User ID:', req.user._id);
        
        const { userId } = req.body;
        
        if (!userId) {
            console.log('[messages.js] No userId provided in request body');
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, userId] }
        }).populate('participants', 'username fullName profileImg');

        if (conversation) {
            console.log('[messages.js] Found existing conversation:', conversation._id);
            return res.json(conversation);
        }

        // Create new conversation
        conversation = new Conversation({
            participants: [req.user._id, userId]
        });

        await conversation.save();
        
        conversation = await Conversation.findById(conversation._id)
            .populate('participants', 'username fullName profileImg');

        console.log('[messages.js] Created new conversation:', conversation._id);
        res.status(201).json(conversation);
    } catch (error) {
        console.error('[messages.js] Error in start-conversation:', error);
        res.status(500).json({ error: 'Failed to start conversation' });
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

        const messages = await Message.find({ conversation: conversationId })
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
            conversation: conversationId,
            senderId: req.user._id,
            content
        });

        await message.save();

        // Update conversation's last message
        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();
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

// Get message requests
router.get('/requests', protectRoute, async (req, res) => {
    try {
        console.log(`[messages.js] Getting message requests for user: ${req.user._id}`);
        
        const requests = await MessageRequest.find({
            recipientId: req.user._id,
            status: 'pending'
        }).populate('senderId', 'username fullName profileImg');

        console.log(`[messages.js] Found ${requests.length} message requests`);
        res.json(requests);
    } catch (error) {
        console.error('[messages.js] Error fetching message requests:', error);
        res.status(500).json({ error: 'Failed to fetch message requests' });
    }
});

// Send message request
router.post('/requests', protectRoute, async (req, res) => {
    try {
        const { recipientId, message } = req.body;
        
        console.log(`[messages.js] Sending message request to user: ${recipientId}`);

        // Check if request already exists
        const existingRequest = await MessageRequest.findOne({
            senderId: req.user._id,
            recipientId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ error: 'Message request already sent' });
        }

        const messageRequest = new MessageRequest({
            senderId: req.user._id,
            recipientId,
            message
        });

        await messageRequest.save();
        
        const populatedRequest = await MessageRequest.findById(messageRequest._id)
            .populate('senderId', 'username fullName profileImg');

        console.log('[messages.js] Message request sent successfully');
        res.status(201).json(populatedRequest);
    } catch (error) {
        console.error('[messages.js] Error sending message request:', error);
        res.status(500).json({ error: 'Failed to send message request' });
    }
});

// Accept message request
router.put('/requests/:requestId/accept', protectRoute, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        console.log(`[messages.js] Accepting message request: ${requestId}`);

        const messageRequest = await MessageRequest.findOne({
            _id: requestId,
            recipientId: req.user._id
        }).populate('senderId', 'username fullName profileImg');

        if (!messageRequest) {
            return res.status(404).json({ error: 'Message request not found' });
        }

        // Create conversation
        const conversation = new Conversation({
            participants: [messageRequest.senderId._id, req.user._id]
        });

        await conversation.save();

        // Create initial message if provided
        if (messageRequest.message) {
            const message = new Message({
                conversation: conversation._id,
                senderId: messageRequest.senderId._id,
                content: messageRequest.message
            });

            await message.save();
            conversation.lastMessage = message._id;
            await conversation.save();
        }

        // Update request status
        messageRequest.status = 'accepted';
        await messageRequest.save();

        const populatedConversation = await Conversation.findById(conversation._id)
            .populate('participants', 'username fullName profileImg');

        console.log('[messages.js] Message request accepted successfully');
        res.json(populatedConversation);
    } catch (error) {
        console.error('[messages.js] Error accepting message request:', error);
        res.status(500).json({ error: 'Failed to accept message request' });
    }
});

// Decline message request
router.put('/requests/:requestId/decline', protectRoute, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        console.log(`[messages.js] Declining message request: ${requestId}`);

        const messageRequest = await MessageRequest.findOne({
            _id: requestId,
            recipientId: req.user._id
        });

        if (!messageRequest) {
            return res.status(404).json({ error: 'Message request not found' });
        }

        messageRequest.status = 'declined';
        await messageRequest.save();

        console.log('[messages.js] Message request declined successfully');
        res.json({ message: 'Message request declined' });
    } catch (error) {
        console.error('[messages.js] Error declining message request:', error);
        res.status(500).json({ error: 'Failed to decline message request' });
    }
});

console.log('[messages.js] All routes defined successfully');

export default router;
