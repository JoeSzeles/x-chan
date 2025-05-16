import leechService from '../services/leechService.js';
import Board from '../models/board.model.js';

export const get4chanThreads = async (req, res) => {
    try {
        const { board, catalog } = req.params;
        
        if (!board) {
            return res.status(400).json({
                success: false,
                error: 'Board parameter is required'
            });
        }

        console.log(`[LeechController] Fetching threads for board: ${board}, catalog: ${catalog}`);
        const threads = await leechService.fetch4chanThreads(board, catalog);
        
        res.json({
            success: true,
            data: threads
        });
    } catch (error) {
        console.error('[LeechController] Error fetching 4chan threads:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch threads'
        });
    }
};

export const getThreadContent = async (req, res) => {
    try {
        const { board, threadId } = req.params;
        
        if (!board || !threadId) {
            return res.status(400).json({
                success: false,
                error: 'Board and threadId parameters are required'
            });
        }

        console.log(`[LeechController] Fetching content for thread: ${board}/${threadId}`);
        const threadContent = await leechService.fetchThreadContent(board, threadId);
        
        res.json({
            success: true,
            data: threadContent
        });
    } catch (error) {
        console.error('[LeechController] Error fetching thread content:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch thread content'
        });
    }
};

export const convertThreadToPost = async (req, res) => {
    try {
        const { board, threadId } = req.params;
        const { repostType, targetBoard } = req.body;
        const userId = req.user._id;

        if (!board || !threadId) {
            return res.status(400).json({
                success: false,
                error: 'Board and threadId parameters are required'
            });
        }

        if (repostType === 'board' && !targetBoard) {
            return res.status(400).json({
                success: false,
                error: 'Target board is required for board reposts'
            });
        }

        console.log(`[LeechController] Converting thread: ${board}/${threadId}`, {
            repostType,
            targetBoard,
            userId
        });

        // If repostType is 'board', find the board by ID
        let targetBoardId = null;
        if (repostType === 'board') {
            const targetBoardDoc = await Board.findById(targetBoard);
            if (!targetBoardDoc) {
                return res.status(404).json({
                    success: false,
                    error: 'Target board not found'
                });
            }
            targetBoardId = targetBoardDoc._id;
        }

        const result = await leechService.convertThreadToPost(
            board,
            threadId,
            {
                repostType,
                targetBoard: targetBoardId,
            userId,
                threadUrl: `https://boards.4channel.org/${board}/thread/${threadId}`
            }
        );

        res.json(result);
    } catch (error) {
        console.error('[LeechController] Error converting thread:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to convert thread'
        });
    }
}; 