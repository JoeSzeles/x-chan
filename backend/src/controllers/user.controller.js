export const updateSettings = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            notifications,
            privacy,
            appearance,
            language,
            accessibility
        } = req.body;

        // Update user settings
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    settings: {
                        notifications,
                        privacy,
                        appearance,
                        language,
                        accessibility
                    }
                }
            },
            { new: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error in updateSettings: ", error.message);
        res.status(500).json({ error: error.message });
    }
}; 