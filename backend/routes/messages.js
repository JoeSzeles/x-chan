const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Start a new conversation
router.post('/start', auth, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    if (recipientId === userId.toString()) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
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

    res.json(conversation);
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all conversations for the logged-in user
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'username profileImg')
    .populate('lastMessage.senderId', 'username')
    .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages in a conversation
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
    .populate('senderId', 'username profileImg')
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/:conversationId', auth, async (req, res) => {
  try {
    const { content } = req.body;
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
      .populate('senderId', 'username profileImg');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Start a new conversation
router.post('/start', auth, async (req, res) => {
  try {
    const { recipientId } = req.body;

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, recipientId]
      });
      await conversation.save();
    }

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username profileImg');

    res.status(201).json(populatedConversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Get followers who allow messages
router.get('/followers', auth, async (req, res) => {
  try {
    console.log('Fetching followers for user:', req.user._id);
    const user = await User.findById(req.user._id)
      .populate({
        path: 'followers',
        select: 'username profileImg allowMessages',
        match: { allowMessages: true }
      });

    if (!user) {
      console.error('User not found:', req.user._id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User followers:', user.followers);
    // Filter out null values (followers who don't allow messages)
    const messageableFollowers = user.followers.filter(follower => follower !== null);
    console.log('Messageable followers:', messageableFollowers);

    res.json(messageableFollowers);
  } catch (error) {
    console.error('Error in /followers endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get message requests (users who want to message you)
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await MessageRequest.find({
      recipientId: req.user._id,
      status: 'pending'
    }).populate('senderId', 'username profileImg');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch message requests' });
  }
});

// Accept message request
router.post('/requests/:requestId/accept', auth, async (req, res) => {
  try {
    const request = await MessageRequest.findById(req.params.requestId);

    if (!request || request.recipientId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'accepted';
    await request.save();

    // Create a new conversation
    const conversation = new Conversation({
      participants: [request.senderId, req.user._id]
    });
    await conversation.save();

    res.json({ conversation, request });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// Reject message request
router.post('/requests/:requestId/reject', auth, async (req, res) => {
  try {
    const request = await MessageRequest.findById(req.params.requestId);

    if (!request || request.recipientId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ request });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

module.exports = router;