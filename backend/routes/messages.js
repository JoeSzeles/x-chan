import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/user.model.js';
import MessageRequest from '../models/MessageRequest.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads (memory storage for direct Cloudinary upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        // Allow images, videos, audio, and common document types
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'application/pdf', 'text/plain',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`), false);
        }
    }
});

// Apply multer middleware to upload route
router.use('/conversations/:conversationId/upload', upload.array('files', 5));

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

// Delete conversation
router.delete('/conversations/:conversationId', protectRoute, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Check if user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId: conversationId });

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversationId);

    console.log(`Conversation ${conversationId} deleted by user ${userId}`);
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message (alternative route for compatibility)
router.post('/:conversationId', protectRoute, async (req, res) => {
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
        console.error('[messages.js] Error details:', {
            message: error.message,
            stack: error.stack,
            conversationId,
            content,
            attachments,
            userId: req.user._id
        });
        res.status(500).json({ 
            error: 'Failed to send message', 
            details: error.message 
        });
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

        // Emit the message to all participants via socket
        const messageWithPopulatedSender = await Message.findById(message._id)
            .populate('senderId', 'username fullName profileImg')
            .populate('conversationId');

        // Add conversation type for frontend notifications
        messageWithPopulatedSender.conversationType = 'direct';

        // Emit to conversation room
        req.io.to(conversationId).emit('new_message', messageWithPopulatedSender);

        console.log('[messages.js] Message sent successfully');
        res.status(201).json(messageWithPopulatedSender);
    } catch (error) {
        console.error('[messages.js] Error sending message:', error);
        console.error('[messages.js] Error details:', {
            message: error.message,
            stack: error.stack,
            conversationId,
            content,
            attachments,
            userId: req.user._id
        });
        res.status(500).json({ 
            error: 'Failed to send message', 
            details: error.message 
        });
    }
});

// File upload route for messages
router.post('/conversations/:conversationId/upload', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const files = req.files || [];

        console.log(`[messages.js] Uploading ${files.length} files for conversation: ${conversationId}`);

        // Check if user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files provided' });
        }

        if (files.length > 5) {
            return res.status(400).json({ error: 'Maximum 5 files allowed' });
        }

        const attachments = [];

        for (const file of files) {
            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                return res.status(413).json({ 
                    error: `File ${file.originalname} exceeds 5MB limit` 
                });
            }

            try {
                // Convert buffer to base64 for Cloudinary upload
                const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

                // Upload to Cloudinary
                const uploadResult = await cloudinary.uploader.upload(base64Data, {
                    folder: 'message_attachments',
                    resource_type: 'auto',
                    quality: 'auto',
                    fetch_format: 'auto'
                });

                // Determine file type
                let fileType = 'file';
                if (file.mimetype.startsWith('image/')) {
                    fileType = 'image';
                } else if (file.mimetype.startsWith('video/')) {
                    fileType = 'video';
                } else if (file.mimetype.startsWith('audio/')) {
                    fileType = 'audio';
                }

                attachments.push({
                    url: uploadResult.secure_url,
                    filename: file.originalname,
                    fileType: fileType,
                    fileSize: file.size,
                    mimeType: file.mimetype
                });

                console.log(`[messages.js] File uploaded successfully: ${file.originalname}`);
            } catch (uploadError) {
                console.error(`[messages.js] Error uploading file ${file.originalname}:`, uploadError);
                return res.status(500).json({ 
                    error: `Failed to upload file: ${file.originalname}` 
                });
            }
        }

        console.log(`[messages.js] All files uploaded successfully`);
        res.json({ attachments });
    } catch (error) {
        console.error('[messages.js] Error in file upload:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

// Import GroupConversation model at the top
import GroupConversation from '../models/GroupConversation.js';

// GROUP CONVERSATION ROUTES

// Create a new group conversation
router.post('/create-group', protectRoute, async (req, res) => {
    console.log('[messages.js] ✓ POST /create-group - ROUTE ACCESSED');
    console.log('[messages.js] Request body:', req.body);
    console.log('[messages.js] User:', req.user ? req.user._id : 'NO USER');

    try {
        const { name, participants } = req.body;

        if (!name || !name.trim()) {
            console.log('[messages.js] ❌ No group name provided');
            return res.status(400).json({ error: 'Group name is required' });
        }

        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            console.log('[messages.js] ❌ No participants provided');
            return res.status(400).json({ error: 'At least one participant is required' });
        }

        console.log('[messages.js] Creating group with name:', name.trim());
        console.log('[messages.js] Participants:', participants);

        // Add the creator to participants if not already included
        const allParticipants = [...new Set([req.user._id.toString(), ...participants])];
        console.log('[messages.js] All participants (including creator):', allParticipants);

        // Validate that all participants exist
        const validUsers = await User.find({ _id: { $in: allParticipants } });
        if (validUsers.length !== allParticipants.length) {
            console.log('[messages.js] ❌ Some participants not found');
            return res.status(400).json({ error: 'Some participants were not found' });
        }

        // Create new group conversation
        const groupConversation = new GroupConversation({
            name: name.trim(),
            participants: allParticipants,
            createdBy: req.user._id,
            admins: [req.user._id] // Creator is automatically an admin
        });

        console.log('[messages.js] Saving group conversation...');
        await groupConversation.save();

        // Populate participants data
        await groupConversation.populate('participants', 'username fullName profileImg');
        await groupConversation.populate('createdBy', 'username fullName profileImg');

        console.log('[messages.js] ✓ Created new group conversation:', groupConversation._id);
        res.status(201).json(groupConversation);

    } catch (error) {
        console.error('[messages.js] ❌ Error in create-group:', error);
        console.error('[messages.js] Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to create group conversation', details: error.message });
    }
});

// Get all group conversations for a user
router.get('/group-conversations', protectRoute, async (req, res) => {
    try {
        console.log(`[messages.js] Getting group conversations for user: ${req.user._id}`);

        const groupConversations = await GroupConversation.find({
            participants: req.user._id,
            isActive: true
        })
        .populate('participants', 'username fullName profileImg')
        .populate('createdBy', 'username fullName profileImg')
        .sort({ lastActivity: -1 });

        console.log(`[messages.js] Found ${groupConversations.length} group conversations`);
        res.json(groupConversations || []);

    } catch (error) {
        console.error('[messages.js] ❌ Error fetching group conversations:', error);
        console.error('[messages.js] Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch group conversations', details: error.message });
    }
});

// Get messages for a specific group conversation
router.get('/group/:conversationId', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        console.log(`[messages.js] Getting group messages for conversation: ${conversationId}`);

        // Check if user is participant in this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            participants: req.user._id,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or access denied' });
        }

        const messages = await Message.find({ conversationId: conversationId })
            .populate('senderId', 'username fullName profileImg')
            .sort({ createdAt: 1 });

        console.log(`[messages.js] Found ${messages.length} group messages`);
        res.json(messages);

    } catch (error) {
        console.error('[messages.js] ❌ Error fetching group messages:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Send a message to a group conversation
router.post('/group/:conversationId/messages', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content, attachments } = req.body;

        console.log(`[messages.js] Sending group message to conversation: ${conversationId}`);

        // Check if user is participant in this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            participants: req.user._id,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or access denied' });
        }

        if (!content && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ error: 'Message content or attachments are required' });
        }

        // Create the message
        const message = new Message({
            conversationId: conversationId,
            senderId: req.user._id,
            content: content || '',
            attachments: attachments || []
        });

        await message.save();

        // Update group conversation's last message and activity
        groupConversation.lastMessage = {
            content: content || '',
            senderId: req.user._id,
            timestamp: message.createdAt
        };
        groupConversation.lastActivity = new Date();
        await groupConversation.save();

        // Populate sender data
        await message.populate('senderId', 'username fullName profileImg');

        // Emit the message to all participants via socket
        const messageWithPopulatedSender = await Message.findById(message._id)
            .populate('senderId', 'username fullName profileImg')
            .populate('conversationId');

        // Add conversation type for frontend notifications
        messageWithPopulatedSender.conversationType = 'group';

        // Emit to conversation room
        req.io.to(conversationId).emit('new_message', messageWithPopulatedSender);

        console.log(`[messages.js] ✓ Group message sent successfully: ${message._id}`);
        res.status(201).json(messageWithPopulatedSender);

    } catch (error) {
        console.error('[messages.js] ❌ Error sending group message:', error);
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

// Add member to group conversation
router.post('/group/:conversationId/add-member', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req.body;

        console.log(`[messages.js] Adding member ${userId} to group conversation: ${conversationId}`);

        // Check if user is admin of this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            admins: req.user._id,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or insufficient permissions' });
        }

        // Check if user is already a participant
        if (groupConversation.participants.includes(userId)) {
            return res.status(400).json({ error: 'User is already a member of this group' });
        }

        // Add user to participants
        groupConversation.participants.push(userId);
        await groupConversation.save();

        // Populate participants data
        await groupConversation.populate('participants', 'username fullName profileImg');

        console.log(`[messages.js] ✓ Member added successfully to group: ${conversationId}`);
        res.json(groupConversation);

    } catch (error) {
        console.error('[messages.js] ❌ Error adding member to group:', error);
        res.status(500).json({ error: 'Failed to add member', details: error.message });
    }
});

// Get unread count for group conversation
router.get('/group/:conversationId/unread-count', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        // Check if user is participant in this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            participants: userId,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or access denied' });
        }

        const unreadCount = await Message.countDocuments({
            conversationId: conversationId,
            senderId: { $ne: userId },
            readBy: { $ne: userId }
        });

        res.json({ unreadCount });

    } catch (error) {
        console.error('[messages.js] ❌ Error fetching group unread count:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Mark group messages as read
router.put('/group/:conversationId/mark-read', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        // Check if user is participant in this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            participants: userId,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or access denied' });
        }

        // Mark all unread messages as read
        await Message.updateMany(
            {
                conversationId: conversationId,
                senderId: { $ne: userId },
                readBy: { $ne: userId }
            },
            {
                $addToSet: { readBy: userId }
            }
        );

        res.json({ success: true });

    } catch (error) {
        console.error('[messages.js] ❌ Error marking group messages as read:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// File upload for group conversations
router.post('/group/:conversationId/upload', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;

        console.log(`[messages.js] Group file upload for conversation: ${conversationId}`);

        // Check if user is participant in this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            participants: req.user._id,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or access denied' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const attachments = [];

        for (const file of req.files) {
            // Determine file type
            let fileType = 'file';
            if (file.mimetype.startsWith('image/')) {
                fileType = 'image';
            } else if (file.mimetype.startsWith('video/')) {
                fileType = 'video';
            } else if (file.mimetype.startsWith('audio/')) {
                fileType = 'audio';
            }

            // In a real application, you would upload to cloud storage
            // For now, we'll create a mock URL
            const fileUrl = `/uploads/group-${conversationId}/${Date.now()}-${file.originalname}`;

            attachments.push({
                url: fileUrl,
                filename: file.originalname,
                fileType: fileType,
                fileSize: file.size,
                mimeType: file.mimetype
            });
        }

        console.log(`[messages.js] ✓ Group files uploaded successfully: ${attachments.length} files`);
        res.json({ attachments });

    } catch (error) {
        console.error('[messages.js] ❌ Error uploading group files:', error);
        res.status(500).json({ error: 'Failed to upload files', details: error.message });
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
console.log('[messages.js] - POST /conversations/:id/upload');
console.log('[messages.js] - POST /create-group');
console.log('[messages.js] - GET  /group-conversations');
console.log('[messages.js] - GET  /group/:conversationId');
console.log('[messages.js] - POST /group/:conversationId/messages');
console.log('[messages.js] - POST /group/:conversationId/add-member');
console.log('[messages.js] - GET  /group/:conversationId/unread-count');
console.log('[messages.js] - PUT  /group/:conversationId/mark-read');
console.log('[messages.js] - POST /group/:conversationId/upload');
console.log('[messages.js] ========================================');

export default router;