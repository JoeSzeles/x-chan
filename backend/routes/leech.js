import express from 'express';
import { get4chanThreads, getThreadContent, convertThreadToPost } from '../controllers/leech.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 4chan thread routes
router.get('/4chan/:board/:catalog', get4chanThreads);
router.get('/4chan/:board/thread/:threadId', getThreadContent);
router.post('/4chan/:board/convert/:threadId', authenticateToken, convertThreadToPost);

export default router; 