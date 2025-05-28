
import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/user.model.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

console.log('[messages.js] Router initialized');
console.log('[messages.js] Express router type:', typeof router);
console.log('[messages.js] Router methods available:', Object.getOwnPropertyNames(router).filter(name => typeof router[name] === 'function'));

// Debug middleware to log all requests to this router
router.use((req, res, next) => {
    console.log(`[messages.js] ${req.method} ${req.path} - Body:`, req.body);
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

// Start a new conversation
router.post('/conversations', protectRoute, async (req, res) => {
    try {
        const { participantId } = req.body;
        console.log(`[messages.js] Starting conversation between ${req.user._id} and ${participantId}`);

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, participantId] }
        }).populate('participants', 'username fullName profileImg');

        if (!conversation) {
            conversation = new Conversation({
                participants: [req.user._id, participantId]
            });
            await conversation.save();
            await conversation.populate('participants', 'username fullName profileImg');
        }

        console.log(`[messages.js] Conversation ready:`, conversation._id);
        res.json(conversation);
    } catch (error) {
        console.error('[messages.js] Error starting conversation:', error);
        res.status(500).json({ error: 'Failed to start conversation' });
    }
});

// Start conversation with a specific user - THIS IS THE ENDPOINT THAT'S FAILING
console.log('[messages.js] Defining POST /start-conversation route...');
router.post('/start-conversation', protectRoute, async (req, res) => {
    try {
        console.log('[messages.js] POST /start-conversation endpoint hit');
        console.log('[messages.js] Request body:', req.body);
        console.log('[messages.js] User from protectRoute:', req.user ? req.user._id : 'No user');

        const { userId } = req.body;
        console.log(`[messages.js] Starting conversation between ${req.user._id} and ${userId}`);

        if (!userId) {
            console.log('[messages.js] Error: No userId provided');
            return res.status(400).json({ error: 'User ID is required' });
        }

        if (userId === req.user._id.toString()) {
            console.log('[messages.js] Error: User trying to start conversation with themselves');
            return res.status(400).json({ error: 'Cannot start conversation with yourself' });
        }

        // Verify the target user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            console.log('[messages.js] Error: Target user not found');
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('[messages.js] Checking if conversation already exists...');
        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, userId] }
        }).populate('participants', 'username fullName profileImg');

        if (!conversation) {
            console.log('[messages.js] Creating new conversation...');
            conversation = new Conversation({
                participants: [req.user._id, userId]
            });
            await conversation.save();
            console.log('[messages.js] Conversation saved, populating participants...');
            await conversation.populate('participants', 'username fullName profileImg');
        } else {
            console.log('[messages.js] Found existing conversation:', conversation._id);
        }

        console.log(`[messages.js] Conversation ready:`, conversation._id);
        console.log('[messages.js] Sending success response');
        res.status(200).json(conversation);
    } catch (error) {
        console.error('[messages.js] Error starting conversation:', error);
        console.error('[messages.js] Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to start conversation' });
    }
});

// Get messages in a conversation
router.get('/:conversationId', protectRoute, async (req, res) => {
    try {
        console.log('Fetching messages for conversation:', req.params.conversationId);

        const messages = await Message.find({
            conversationId: req.params.conversationId
        })
        .populate('senderId', 'username profileImg profilePicture')
        .sort({ createdAt: 1 });

        console.log('Found messages:', messages.length);
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
router.post('/:conversationId', protectRoute, async (req, res) => {
    try {
        const { content } = req.body;
        console.log('Sending message to conversation:', req.params.conversationId);

        const newMessage = new Message({
            conversationId: req.params.conversationId,
            senderId: req.user._id,
            content,
            readBy: [req.user._id]
        });
        await newMessage.save();

        // Update conversation's lastMessage and updatedAt
        await Conversation.findByIdAndUpdate(req.params.conversationId, {
            lastMessage: {
                content,
                senderId: req.user._id,
                timestamp: new Date()
            },
            updatedAt: new Date()
        });

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'username profileImg profilePicture');

        console.log('Message sent successfully');
        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Mark messages as read
router.patch('/conversations/:conversationId/read', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        await Message.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: userId },
                readBy: { $nin: [userId] }
            },
            {
                $addToSet: { readBy: userId }
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

console.log('[messages.js] =================================');
console.log('[messages.js] Router setup complete');
console.log('[messages.js] Total routes defined:', router.stack?.length || 'unknown');
console.log('[messages.js] Routes stack:', router.stack?.map(layer => ({
    path: layer.route?.path,
    methods: layer.route?.methods
})) || 'undefined');
console.log('[messages.js] =================================');

export default router;
