import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/user.model.js';
import MessageRequest from '../models/MessageRequest.js';
import { v2 as cloudinary } from 'cloudinary';

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

// Get unread messages count
router.get('/unread-count', protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all conversations where user is a participant
    const conversations = await Conversation.find({
      participants: userId
    });

    let unreadCount = 0;

    for (const conversation of conversations) {
      // Count unread messages in each conversation
      const count = await Message.countDocuments({
        conversationId: conversation._id,
        senderId: { $ne: userId }, // Not sent by current user
        readBy: { $ne: userId } // Not read by current user
      });
      unreadCount += count;
    }

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
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

// Get unread count for specific conversation
router.get('/conversations/:conversationId/unread-count', protectRoute, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Count unread messages in this conversation
    const unreadCount = await Message.countDocuments({
      conversationId: conversationId,
      senderId: { $ne: userId }, // Not sent by current user
      readBy: { $ne: userId } // Not read by current user
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching conversation unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark messages as read
router.put('/conversations/:conversationId/mark-read', protectRoute, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Update all unread messages in this conversation
    await Message.updateMany(
      {
        conversationId: conversationId,
        senderId: { $ne: userId }, // Not sent by current user
        readBy: { $ne: userId } // Not already read by current user
      },
      {
        $addToSet: { readBy: userId }
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Internal server error' });
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

// Add/remove reaction to message
router.post('/conversations/:conversationId/messages/:messageId/reactions', protectRoute, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Find existing reaction for this emoji
    let reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);

    if (reactionIndex === -1) {
      // Create new reaction
      message.reactions.push({
        emoji,
        users: [userId],
        count: 1
      });
    } else {
      // Toggle user's reaction
      const reaction = message.reactions[reactionIndex];
      const userIndex = reaction.users.indexOf(userId);

      if (userIndex === -1) {
        // Add user to reaction
        reaction.users.push(userId);
        reaction.count++;
      } else {
        // Remove user from reaction
        reaction.users.splice(userIndex, 1);
        reaction.count--;

        // Remove reaction if no users left
        if (reaction.count === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      }
    }

    await message.save();
    await message.populate('senderId', 'username fullName profileImg');

    res.json(message);
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit message
router.put('/conversations/:conversationId/messages/:messageId', protectRoute, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user owns the message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }

    // Check if message is not too old (optional: 15 minutes limit)
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > fifteenMinutes) {
      return res.status(400).json({ error: 'Message too old to edit' });
    }

    message.content = content;
    message.editedAt = new Date();
    message.isEdited = true;

    await message.save();
    await message.populate('senderId', 'username fullName profileImg');

    res.json(message);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete message
router.delete('/conversations/:conversationId/messages/:messageId', protectRoute, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user owns the message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message
router.post('/:conversationId/messages', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content, attachments } = req.body;
        const senderId = req.user._id;

        if ((!content || content.trim() === '') && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ error: 'Message content or attachments are required' });
        }

        // Verify conversation exists and user is a participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.includes(senderId);
        if (!isParticipant) {
            return res.status(403).json({ error: 'You are not a participant in this conversation' });
        }

        // Create new message
        const message = new Message({
            conversationId,
            senderId,
            content: content ? content.trim() : '',
            attachments: attachments || [],
            messageType: attachments && attachments.length > 0 ? 'image' : 'text'
        });

        await message.save();

        // Update conversation's last message and activity
        conversation.lastMessage = {
            content: content ? content.trim() : (attachments && attachments.length > 0 ? 'Sent an attachment' : ''),
            senderId,
            timestamp: message.createdAt
        };
        conversation.lastActivity = new Date();
        await conversation.save();

        // Populate sender info
        await message.populate('senderId', 'username fullName profileImg');

        // Emit to all participants
        conversation.participants.forEach(participantId => {
            if (participantId.toString() !== senderId.toString()) {
                req.io.to(participantId.toString()).emit('newMessage', message);
            }
        });

        res.status(201).json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Internal server error' });
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
        const { content, attachments } = req.body;

        console.log(`[messages.js] Sending message to conversation: ${conversationId}`);

        // Check if user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Determine message type based on content and attachments
        let messageType = 'text';
        if (attachments && attachments.length > 0) {
            const firstAttachment = attachments[0];
            if (firstAttachment.fileType === 'image') {
                messageType = 'image';
            } else if (firstAttachment.fileType === 'video') {
                messageType = 'video';
            } else if (firstAttachment.fileType === 'audio') {
                messageType = 'audio';
            } else {
                messageType = 'file';
            }
        }

        const message = new Message({
            conversationId: conversationId,
            senderId: req.user._id,
            content: content || '',
            messageType,
            attachments: attachments || []
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

// Upload files for a conversation
router.post('/conversations/:conversationId/upload', protectRoute, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { files } = req.body; // Expecting base64 encoded files

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Verify conversation exists and user has access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attachments = [];

    for (const file of files) {
      try {
        // Check file size (roughly 5MB for base64)
        const base64Size = Math.ceil((file.data.length * 3) / 4);
        if (base64Size > 5 * 1024 * 1024) {
          return res.status(413).json({ error: `File ${file.name} is too large. Maximum size is 5MB` });
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.data, {
          folder: 'messages',
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto'
        });

        attachments.push({
          fileType: file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 
                    file.type.startsWith('audio/') ? 'audio' : 'file',
          url: result.secure_url,
          filename: file.name,
          fileSize: file.size,
          mimetype: file.type
        });
      } catch (uploadError) {
        console.error('Error uploading file to Cloudinary:', uploadError);
        return res.status(500).json({ error: `Failed to upload ${file.name}` });
      }
    }

    res.json({ attachments });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
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