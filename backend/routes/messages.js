
import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import MessageRequest from '../models/MessageRequest.js';
import User from '../models/User.js';
import { authenticateToken as auth } from '../middleware/auth.js';

const router = express.Router();

// Get all conversations for the logged-in user
router.get('/conversations', auth, async (req, res) => {
  try {
    console.log('Auth user in conversations:', req.user._id);
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'username profilePicture profileImg')
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
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
    .populate('senderId', 'username profilePicture profileImg')
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
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
      .populate('participants', 'username profilePicture profileImg');

    res.status(201).json(populatedConversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Get followers who allow messages
router.get('/followers', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'followers',
      select: 'username profilePicture profileImg allowMessages'
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User found:', user.username);
    console.log('User followers field exists:', !!user.followers);
    console.log('User followers count:', user.followers?.length || 0);
    
    // Handle case where followers array doesn't exist or is empty
    const followers = user.followers || [];
    
    // Filter followers who allow messages (default is true if not set)
    const messageableFollowers = followers.filter(follower => 
      follower && follower.allowMessages !== false
    );
    
    console.log('Messageable followers count:', messageableFollowers.length);
    
    // If no followers, return all users as fallback
    if (messageableFollowers.length === 0) {
      const allUsers = await User.find({ 
        _id: { $ne: req.user._id },
        allowMessages: { $ne: false }
      }).select('username profileImg allowMessages').limit(20);
      
      console.log('No followers found, returning all users:', allUsers.length);
      return res.json(allUsers);
    }
    
    res.json(messageableFollowers);
  } catch (error) {
    console.error('Error in /followers endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get all users for messaging
router.get('/users', auth, async (req, res) => {
  try {
    const allUsers = await User.find({ 
      _id: { $ne: req.user._id },
      allowMessages: { $ne: false }
    }).select('username profileImg allowMessages').limit(50);
    
    console.log('All messageable users:', allUsers.length);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get message requests (users who want to message you)
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await MessageRequest.find({
      recipientId: req.user._id,
      status: 'pending'
    }).populate('senderId', 'username profilePicture profileImg');

    console.log('Message requests found:', requests.length);
    res.json(requests || []);
  } catch (error) {
    console.error('Error fetching message requests:', error);
    res.status(500).json({ error: 'Failed to fetch message requests' });
  }
});

// Test endpoint to check available users
router.get('/test/users', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const allUsers = await User.find({ 
      _id: { $ne: req.user._id } 
    }).select('username profileImg allowMessages').limit(10);
    
    console.log('Current user:', currentUser?.username);
    console.log('Available users:', allUsers.length);
    console.log('Users with allowMessages:', allUsers.filter(u => u.allowMessages !== false).length);
    
    res.json({
      currentUser: currentUser?.username,
      totalUsers: allUsers.length,
      users: allUsers
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: 'Test failed' });
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

export default router;
