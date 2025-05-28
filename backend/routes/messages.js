
import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/user.model.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

// Get all conversations for the logged-in user
router.get('/conversations', protectRoute, async (req, res) => {
  try {
    console.log('Fetching conversations for user:', req.user._id);
    
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'username profileImg profilePicture fullName')
    .populate('lastMessage.senderId', 'username')
    .sort({ updatedAt: -1 });

    console.log('Found conversations:', conversations.length);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
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

// Start a new conversation
router.post('/start', protectRoute, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user._id;

    console.log('Starting conversation between:', userId, 'and', recipientId);

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    if (recipientId === userId.toString()) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.log('Recipient not found:', recipientId);
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] }
    }).populate('participants', 'username profileImg profilePicture fullName');

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [userId, recipientId],
        lastMessage: null,
        lastActivity: new Date()
      });
      await conversation.save();

      // Populate participants
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'username profileImg profilePicture fullName');
    }

    console.log('Conversation created/found:', conversation._id);
    res.json(conversation);
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
