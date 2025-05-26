
import mongoose from 'mongoose';
import Notification from '../models/notification.model.js';
import Post from '../models/post.model.js';
import User from '../models/user.model.js';
import connectMongoDB from '../db/connectMongoDB.js';

const fixNotificationReferences = async () => {
    try {
        await connectMongoDB();
        console.log('Connected to MongoDB');

        // Find all notifications of types that should have post references but don't
        const brokenNotifications = await Notification.find({
            type: { $in: ['like', 'repost', 'bookmark', 'comment'] },
            $and: [
                { referencedPost: { $exists: false } },
                { postId: { $exists: false } },
                { post: { $exists: false } }
            ]
        }).populate('from to');

        console.log(`Found ${brokenNotifications.length} notifications missing post references`);

        if (brokenNotifications.length === 0) {
            console.log('No broken notifications found');
            process.exit(0);
        }

        let fixedCount = 0;
        let deletedCount = 0;

        for (const notification of brokenNotifications) {
            try {
                // Try to find the most recent post by the recipient around the notification time
                const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
                const notificationTime = new Date(notification.createdAt);
                const startTime = new Date(notificationTime.getTime() - timeWindow);
                const endTime = new Date(notificationTime.getTime() + timeWindow);

                const possiblePost = await Post.findOne({
                    user: notification.to._id,
                    createdAt: {
                        $gte: startTime,
                        $lte: endTime
                    }
                }).sort({ createdAt: -1 });

                if (possiblePost) {
                    // Update the notification with the found post reference
                    await Notification.findByIdAndUpdate(notification._id, {
                        postId: possiblePost._id,
                        post: possiblePost._id,
                        referencedPost: possiblePost._id
                    });
                    
                    console.log(`Fixed notification ${notification._id} - linked to post ${possiblePost._id}`);
                    fixedCount++;
                } else {
                    // If we can't find a related post, delete the broken notification
                    await Notification.findByIdAndDelete(notification._id);
                    console.log(`Deleted orphaned notification ${notification._id} (no related post found)`);
                    deletedCount++;
                }
            } catch (error) {
                console.error(`Error processing notification ${notification._id}:`, error);
            }
        }

        console.log(`\nSummary:`);
        console.log(`- Fixed: ${fixedCount} notifications`);
        console.log(`- Deleted: ${deletedCount} orphaned notifications`);
        console.log(`Migration completed successfully`);

    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
};

// Run the migration
fixNotificationReferences();
