import List from '../models/List.js';
import Post from '../models/post.js';
import Thread from '../models/Thread.js';
import User from '../models/User.js';

// Get all lists for a user
export const getLists = async (req, res) => {
    try {
        const { privacy } = req.query;
        const query = { owner: req.user._id };
        
        if (privacy) {
            query.privacy = privacy;
        }

        const lists = await List.find(query)
            .populate('owner', 'username name profilePic')
            .sort({ createdAt: -1 });

        res.json(lists);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get list items based on type
export const getListItems = async (req, res) => {
    try {
        const { listId } = req.params;
        const { type } = req.query;

        const list = await List.findById(listId);
        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        // Check if user has access to the list
        if (list.privacy === 'private' && list.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let items = [];
        const filteredItems = type ? list.items.filter(item => item.type === type) : list.items;

        for (const item of filteredItems) {
            let itemData;
            switch (item.type) {
                case 'post':
                    itemData = await Post.findById(item.itemId)
                        .populate('user', 'username name profilePic');
                    break;
                case 'thread':
                    itemData = await Thread.findById(item.itemId)
                        .populate('user', 'username name profilePic');
                    break;
                case 'user':
                    itemData = await User.findById(item.itemId)
                        .select('username name profilePic bio followers following');
                    break;
            }
            if (itemData) {
                items.push({
                    type: item.type,
                    data: itemData
                });
            }
        }

        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new list
export const createList = async (req, res) => {
    try {
        const { name, description, privacy } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'List name is required' });
        }

        const list = new List({
            name,
            description,
            privacy: privacy || 'public',
            owner: req.user._id
        });

        await list.save();
        res.status(201).json(list);
    } catch (error) {
        console.error('Error creating list:', error);
        res.status(500).json({ error: error.message });
    }
};

// Add item to list
export const addItemToList = async (req, res) => {
    try {
        const { listId } = req.params;
        const { type, itemId } = req.body;

        if (!type || !itemId) {
            return res.status(400).json({ error: 'Type and itemId are required' });
        }

        const list = await List.findById(listId);
        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        // Check if user owns the list
        if (list.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check if item already exists in list
        const itemExists = list.items.some(
            item => item.type === type && item.itemId.toString() === itemId
        );

        if (itemExists) {
            return res.status(400).json({ error: 'Item already in list' });
        }

        list.items.push({ type, itemId });
        await list.save();

        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Remove item from list
export const removeItemFromList = async (req, res) => {
    try {
        const { listId } = req.params;
        const { type, itemId } = req.body;

        if (!type || !itemId) {
            return res.status(400).json({ error: 'Type and itemId are required' });
        }

        const list = await List.findById(listId);
        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        // Check if user owns the list
        if (list.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        list.items = list.items.filter(
            item => !(item.type === type && item.itemId.toString() === itemId)
        );

        await list.save();
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update list
export const updateList = async (req, res) => {
    try {
        const { listId } = req.params;
        const { name, description, privacy } = req.body;

        const list = await List.findById(listId);
        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        // Check if user owns the list
        if (list.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (name) list.name = name;
        if (description) list.description = description;
        if (privacy) list.privacy = privacy;

        await list.save();
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete list
export const deleteList = async (req, res) => {
    try {
        const { listId } = req.params;

        const list = await List.findById(listId);
        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        // Check if user owns the list
        if (list.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await list.deleteOne();
        res.json({ message: 'List deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Follow/Unfollow list
export const toggleFollowList = async (req, res) => {
    try {
        const { listId } = req.params;
        const list = await List.findById(listId);
        
        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }

        // Check if list is private and user is not the owner
        if (list.privacy === 'private' && list.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const followerIndex = list.followers.indexOf(req.user._id);
        if (followerIndex === -1) {
            list.followers.push(req.user._id);
        } else {
            list.followers.splice(followerIndex, 1);
        }

        await list.save();
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}; 