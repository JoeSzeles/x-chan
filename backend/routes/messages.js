import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/user.model.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

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

// Start conversation with a specific user
router.post('/start-conversation', protectRoute, async (req, res) => {
    try {
        const { userId } = req.body;
        console.log(`[messages.js] Starting conversation between ${req.user._id} and ${userId}`);

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        if (userId === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot start conversation with yourself' });
        }

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, userId] }
        }).populate('participants', 'username fullName profileImg');

        if (!conversation) {
            conversation = new Conversation({
                participants: [req.user._id, userId]
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

export default router;