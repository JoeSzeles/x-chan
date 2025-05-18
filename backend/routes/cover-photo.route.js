app.put('/api/cover-photo/update', protectRoute, async (req, res) => {
    try {
        const { type, content, metadata } = req.body;
        const userId = req.user._id;

        const user = await User.findByIdAndUpdate(
            userId,
            { 
                coverPhoto: { type, content, metadata }
            },
            { new: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            user: user,
            coverPhoto: user.coverPhoto
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});