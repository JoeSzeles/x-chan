import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    getLists,
    getListItems,
    createList,
    addItemToList,
    removeItemFromList,
    updateList,
    deleteList,
    toggleFollowList
} from '../controllers/listController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Get all lists for the authenticated user
router.get('/', getLists);

// Get items from a specific list
router.get('/:listId/items', getListItems);

// Create a new list
router.post('/', createList);

// Add item to list
router.post('/:listId/items', addItemToList);

// Remove item from list
router.delete('/:listId/items', removeItemFromList);

// Update list
router.put('/:listId', updateList);

// Delete list
router.delete('/:listId', deleteList);

// Follow/Unfollow list
router.post('/:listId/follow', toggleFollowList);

export default router; 