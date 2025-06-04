
import express from 'express';
import { protectRoute } from '../middleware/protectRoute.js';
import GroupConversation from '../models/GroupConversation.js';
import Message from '../models/Message.js';
import User from '../models/user.model.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'application/pdf', 'text/plain'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`), false);
        }
    }
});

console.log('[groupMessages.js] ========================================');
console.log('[groupMessages.js] INITIALIZING GROUP MESSAGES ROUTER');
console.log('[groupMessages.js] ========================================');

// Create a new group conversation
router.post('/create', protectRoute, async (req, res) => {
    console.log('[groupMessages.js] ✓ POST /create - ROUTE ACCESSED');
    console.log('[groupMessages.js] Request body:', req.body);
    console.log('[groupMessages.js] User:', req.user ? req.user._id : 'NO USER');
    console.log('[groupMessages.js] Request headers:', req.headers);

    try {
        const { name, participants } = req.body;

        // Validate user is authenticated
        if (!req.user || !req.user._id) {
            console.log('[groupMessages.js] ❌ User not authenticated');
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!name || typeof name !== 'string' || !name.trim()) {
            console.log('[groupMessages.js] ❌ No group name provided or invalid');
            return res.status(400).json({ error: 'Group name is required and must be a valid string' });
        }

        if (!participants || !Array.isArray(participants)) {
            console.log('[groupMessages.js] ❌ Participants must be an array');
            return res.status(400).json({ error: 'Participants must be an array' });
        }

        // Allow empty participants array - just the creator
        if (participants.length === 0) {
            console.log('[groupMessages.js] ℹ️ Creating group with only creator');
        }

        console.log('[groupMessages.js] Creating group with name:', name.trim());
        console.log('[groupMessages.js] Participants:', participants);

        // Add the creator to participants if not already included
        const creatorId = req.user._id.toString();
        const participantIds = participants.filter(p => p && p.toString() !== creatorId);
        const allParticipants = [creatorId, ...participantIds];
        
        console.log('[groupMessages.js] All participants (including creator):', allParticipants);

        // Validate that all participants exist
        if (participantIds.length > 0) {
            const validUsers = await User.find({ _id: { $in: participantIds } });
            if (validUsers.length !== participantIds.length) {
                console.log('[groupMessages.js] ❌ Some participants not found');
                const foundIds = validUsers.map(u => u._id.toString());
                const missingIds = participantIds.filter(id => !foundIds.includes(id.toString()));
                return res.status(400).json({ 
                    error: 'Some participants were not found',
                    missingIds: missingIds
                });
            }
        }

        // Create new group conversation
        const groupConversation = new GroupConversation({
            name: name.trim(),
            participants: allParticipants,
            createdBy: req.user._id,
            admins: [req.user._id] // Creator is automatically an admin
        });

        console.log('[groupMessages.js] Saving group conversation...');
        await groupConversation.save();

        // Populate participants data
        await groupConversation.populate('participants', 'username fullName profileImg');
        await groupConversation.populate('createdBy', 'username fullName profileImg');

        console.log('[groupMessages.js] ✓ Created new group conversation:', groupConversation._id);
        console.log('[groupMessages.js] ✓ Group conversation data:', JSON.stringify(groupConversation, null, 2));
        
        res.status(201).json(groupConversation);

    } catch (error) {
        console.error('[groupMessages.js] ❌ Error in create:', error);
        console.error('[groupMessages.js] Error name:', error.name);
        console.error('[groupMessages.js] Error message:', error.message);
        console.error('[groupMessages.js] Error stack:', error.stack);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Validation error', 
                details: error.message,
                validationErrors: error.errors
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to create group conversation', 
            details: error.message,
            errorType: error.name
        });
    }
});

// Get all group conversations for a user
router.get('/', protectRoute, async (req, res) => {
    try {
        console.log(`[groupMessages.js] Getting group conversations for user: ${req.user._id}`);

        const groupConversations = await GroupConversation.find({
            participants: req.user._id,
            isActive: true
        })
        .populate('participants', 'username fullName profileImg')
        .populate('createdBy', 'username fullName profileImg')
        .sort({ lastActivity: -1 });

        console.log(`[groupMessages.js] Found ${groupConversations.length} group conversations`);
        res.json(groupConversations || []);

    } catch (error) {
        console.error('[groupMessages.js] ❌ Error fetching group conversations:', error);
        console.error('[groupMessages.js] Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch group conversations', details: error.message });
    }
});

// Get messages for a specific group conversation
router.get('/:conversationId/messages', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        console.log(`[groupMessages.js] Getting group messages for conversation: ${conversationId}`);

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

        console.log(`[groupMessages.js] Found ${messages.length} group messages`);
        res.json(messages);

    } catch (error) {
        console.error('[groupMessages.js] ❌ Error fetching group messages:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Send a message to a group conversation
router.post('/:conversationId/messages', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content, attachments } = req.body;

        console.log(`[groupMessages.js] Sending group message to conversation: ${conversationId}`);

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

        // Create the message
        const message = new Message({
            conversationId: conversationId,
            senderId: req.user._id,
            content: content || '',
            messageType,
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

        console.log(`[groupMessages.js] ✓ Group message sent successfully: ${message._id}`);
        res.status(201).json(message);

    } catch (error) {
        console.error('[groupMessages.js] ❌ Error sending group message:', error);
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

// Add member to group conversation
router.post('/:conversationId/add-member', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req.body;

        console.log(`[groupMessages.js] Adding member ${userId} to group conversation: ${conversationId}`);

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

        console.log(`[groupMessages.js] ✓ Member added successfully to group: ${conversationId}`);
        res.json(groupConversation);

    } catch (error) {
        console.error('[groupMessages.js] ❌ Error adding member to group:', error);
        res.status(500).json({ error: 'Failed to add member', details: error.message });
    }
});

// Get unread count for group conversation
router.get('/:conversationId/unread-count', protectRoute, async (req, res) => {
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
        console.error('[groupMessages.js] ❌ Error fetching group unread count:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Mark group messages as read
router.put('/:conversationId/mark-read', protectRoute, async (req, res) => {
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
        console.error('[groupMessages.js] ❌ Error marking group messages as read:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// File upload for group conversations
router.post('/:conversationId/upload', upload.array('files', 5), protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const files = req.files || [];

        console.log(`[groupMessages.js] Group file upload for conversation: ${conversationId}`);

        // Check if user is participant in this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            participants: req.user._id,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or access denied' });
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
                    folder: 'group_message_attachments',
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

                console.log(`[groupMessages.js] File uploaded successfully: ${file.originalname}`);
            } catch (uploadError) {
                console.error(`[groupMessages.js] Error uploading file ${file.originalname}:`, uploadError);
                return res.status(500).json({ 
                    error: `Failed to upload file: ${file.originalname}` 
                });
            }
        }

        console.log(`[groupMessages.js] ✓ Group files uploaded successfully: ${attachments.length} files`);
        res.json({ attachments });

    } catch (error) {
        console.error('[groupMessages.js] ❌ Error uploading group files:', error);
        res.status(500).json({ error: 'Failed to upload files', details: error.message });
    }
});

// Delete group conversation
router.delete('/:conversationId', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        console.log(`[groupMessages.js] Deleting group conversation: ${conversationId} by user: ${userId}`);

        // Check if user is admin of this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            admins: userId,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or insufficient permissions' });
        }

        // Delete all messages in the group conversation
        await Message.deleteMany({ conversationId: conversationId });

        // Mark group conversation as inactive instead of deleting (for data integrity)
        groupConversation.isActive = false;
        await groupConversation.save();

        console.log(`[groupMessages.js] ✓ Group conversation ${conversationId} deleted successfully`);
        res.json({ message: 'Group conversation deleted successfully' });

    } catch (error) {
        console.error('[groupMessages.js] ❌ Error deleting group conversation:', error);
        res.status(500).json({ error: 'Failed to delete group conversation', details: error.message });
    }
});

// Remove member from group conversation
router.delete('/:conversationId/members/:userId', protectRoute, async (req, res) => {
    try {
        const { conversationId, userId: memberToRemove } = req.params;
        const currentUserId = req.user._id;

        console.log(`[groupMessages.js] Removing member ${memberToRemove} from group conversation: ${conversationId}`);

        // Check if current user is admin of this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            admins: currentUserId,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or insufficient permissions' });
        }

        // Check if member to remove is part of the group
        if (!groupConversation.participants.includes(memberToRemove)) {
            return res.status(400).json({ error: 'User is not a member of this group' });
        }

        // Remove user from participants and admins (if applicable)
        groupConversation.participants = groupConversation.participants.filter(
            id => id.toString() !== memberToRemove.toString()
        );
        groupConversation.admins = groupConversation.admins.filter(
            id => id.toString() !== memberToRemove.toString()
        );

        await groupConversation.save();

        // Populate participants data
        await groupConversation.populate('participants', 'username fullName profileImg');

        console.log(`[groupMessages.js] ✓ Member removed successfully from group: ${conversationId}`);
        res.json(groupConversation);

    } catch (error) {
        console.error('[groupMessages.js] ❌ Error removing member from group:', error);
        res.status(500).json({ error: 'Failed to remove member', details: error.message });
    }
});

// Leave group conversation
router.post('/:conversationId/leave', protectRoute, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        console.log(`[groupMessages.js] User ${userId} leaving group conversation: ${conversationId}`);

        // Check if user is participant in this group conversation
        const groupConversation = await GroupConversation.findOne({
            _id: conversationId,
            participants: userId,
            isActive: true
        });

        if (!groupConversation) {
            return res.status(404).json({ error: 'Group conversation not found or access denied' });
        }

        // Remove user from participants and admins (if applicable)
        groupConversation.participants = groupConversation.participants.filter(
            id => id.toString() !== userId.toString()
        );
        groupConversation.admins = groupConversation.admins.filter(
            id => id.toString() !== userId.toString()
        );

        // If no participants left, mark group as inactive
        if (groupConversation.participants.length === 0) {
            groupConversation.isActive = false;
        }

        await groupConversation.save();

        console.log(`[groupMessages.js] ✓ User left group conversation successfully: ${conversationId}`);
        res.json({ message: 'Left group conversation successfully' });

    } catch (error) {
        console.error('[groupMessages.js] ❌ Error leaving group conversation:', error);
        res.status(500).json({ error: 'Failed to leave group conversation', details: error.message });
    }
});

console.log('[groupMessages.js] ========================================');
console.log('[groupMessages.js] ALL GROUP ROUTES REGISTERED SUCCESSFULLY');
console.log('[groupMessages.js] Available routes:');
console.log('[groupMessages.js] - POST /create');
console.log('[groupMessages.js] - GET  /');
console.log('[groupMessages.js] - GET  /:conversationId/messages');
console.log('[groupMessages.js] - POST /:conversationId/messages');
console.log('[groupMessages.js] - POST /:conversationId/add-member');
console.log('[groupMessages.js] - GET  /:conversationId/unread-count');
console.log('[groupMessages.js] - PUT  /:conversationId/mark-read');
console.log('[groupMessages.js] - POST /:conversationId/upload');
console.log('[groupMessages.js] - DELETE /:conversationId');
console.log('[groupMessages.js] - DELETE /:conversationId/members/:userId');
console.log('[groupMessages.js] - POST /:conversationId/leave');
console.log('[groupMessages.js] ========================================');

export default router;
