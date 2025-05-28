const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all conversations for the logged-in user
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'username profilePicture')
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
    .populate('senderId', 'username profilePicture')
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
    const conversationId = req.params.conversationId;

    // Verify user is part of conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to send messages in this conversation' });
    }

    const message = new Message({
      conversationId,
      senderId: req.user._id,
      content
    });

    await message.save();
    await message.populate('senderId', 'username profilePicture profileImg');

    // Update conversation's last message
    conversation.lastMessage = {
      content,
      senderId: req.user._id,
      timestamp: new Date()
    };
    conversation.updatedAt = new Date();
    await conversation.save();

    // Broadcast message via socket.io if available
    const io = req.app.get('socketio');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('newMessage', message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
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
      .populate('participants', 'username profilePicture');

    res.status(201).json(populatedConversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Get followers who allow messages
router.get('/followers', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'followers',
        select: 'username profilePicture profileImg allowMessages',
        match: { allowMessages: { $ne: false } }
      });

    if (!user) {
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
    }).populate('senderId', 'username profilePicture');

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