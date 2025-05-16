const register = async (req, res) => {
    try {
        const { username, email, password, name } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'User already exists' 
            });
        }

        // Create new user with default video cover
        const user = new User({
            username,
            email,
            password,
            name,
            coverPhoto: {
                type: 'video',
                content: 'dQw4w9WgXcQ',
                metadata: {
                    videoId: 'dQw4w9WgXcQ',
                    source: 'youtube'
                }
            }
        });

        await user.save();

        // Create default first post with the same video
        const defaultPost = new Post({
            user: user._id,
            content: 'Welcome to my profile! 🎉',
            media: [{
                type: 'video',
                url: 'https://youtu.be/dQw4w9WgXcQ',
                thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg`
            }],
            isDefaultPost: true
        });

        await defaultPost.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                coverPhoto: user.coverPhoto
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Error registering user',
            error: error.message 
        });
    }
}; 