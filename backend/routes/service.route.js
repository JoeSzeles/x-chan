import express from 'express';
import Service from '../models/Service.js';
import { protectRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all services with filtering
router.get('/', protectRoute, async (req, res) => {
    try {
        const { category, search, sort = 'newest' } = req.query;
        
        let query = { isActive: true };
        
        // Apply category filter if provided
        if (category && category !== 'all') {
            query.category = category;
        }
        
        // Apply search filter if provided
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Apply sorting
        let sortOption = {};
        switch (sort) {
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            case 'oldest':
                sortOption = { createdAt: 1 };
                break;
            case 'popular':
                sortOption = { views: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }
        
        const services = await Service.find(query)
            .populate('creator', 'username profilePicture')
            .sort(sortOption);
            
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's services
router.get('/my-services', protectRoute, async (req, res) => {
    try {
        const services = await Service.find({ creator: req.user.id })
            .populate('creator', 'username profilePicture')
            .sort({ createdAt: -1 });
            
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new service
router.post('/', protectRoute, async (req, res) => {
    try {
        const {
            category,
            title,
            content,
            images,
            price,
            location,
            contactInfo,
            tags
        } = req.body;
        
        const service = new Service({
            creator: req.user.id,
            category,
            title,
            content,
            images,
            price,
            location,
            contactInfo,
            tags
        });
        
        await service.save();
        
        const populatedService = await Service.findById(service._id)
            .populate('creator', 'username profilePicture');
            
        res.status(201).json(populatedService);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a service
router.put('/:id', protectRoute, async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        if (service.creator.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this service' });
        }
        
        const updatedService = await Service.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).populate('creator', 'username profilePicture');
        
        res.status(200).json(updatedService);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a service
router.delete('/:id', protectRoute, async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        if (service.creator.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this service' });
        }
        
        await service.deleteOne();
        
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Like/Unlike a service
router.post('/:id/like', protectRoute, async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        const likeIndex = service.likes.indexOf(req.user.id);
        
        if (likeIndex === -1) {
            service.likes.push(req.user.id);
        } else {
            service.likes.splice(likeIndex, 1);
        }
        
        await service.save();
        
        res.status(200).json(service);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a comment to a service
router.post('/:id/comment', protectRoute, async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        service.comments.push({
            user: req.user.id,
            content: req.body.content
        });
        
        await service.save();
        
        const populatedService = await Service.findById(service._id)
            .populate('creator', 'username profilePicture')
            .populate('comments.user', 'username profilePicture');
            
        res.status(200).json(populatedService);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router; 