import User from "../models/user.model.js";
import Post from "../models/post.model.js";

export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        console.log("Search query received:", q);
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ error: "Search query is required" });
        }

        const searchTerm = q.trim();
        console.log("Searching for users with term:", searchTerm);

        // Create a case-insensitive regex pattern
        const searchPattern = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        
        const users = await User.find({
            $or: [
                { username: searchPattern },
                { fullName: searchPattern }
            ]
        })
        .select('username fullName profileImg')
        .limit(10)
        .lean();

        console.log("Found users:", users.length, users.map(u => u.username));
        res.status(200).json(users);
    } catch (error) {
        console.error("Error in searchUsers:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const searchPosts = async (req, res) => {
    try {
        const { q } = req.query;
        console.log("Search query for posts:", q);
        
        if (!q) {
            return res.status(400).json({ error: "Search query is required" });
        }

        // Create a case-insensitive regex pattern
        const searchPattern = new RegExp(q, 'i');
        
        const posts = await Post.find({
            $or: [
                { text: searchPattern },
                { 'replies.text': searchPattern }
            ]
        })
        .populate('postedBy', 'username fullName profileImg')
        .sort({ createdAt: -1 })
        .limit(10);

        console.log("Found posts:", posts.length);
        res.status(200).json(posts);
    } catch (error) {
        console.error("Error in searchPosts:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}; 