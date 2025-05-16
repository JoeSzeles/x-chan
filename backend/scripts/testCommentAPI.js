import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Create axios instance with cookie handling
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true // This is important for handling cookies
});

const testCommentAPI = async () => {
    try {
        console.log("\n=== Starting Comment API Tests ===\n");

        // Test 1: Login as user1
        await api.post('/auth/login', {
            username: "testuser1",
            password: "password123"
        });
        console.log("Logged in as user1");

        // Create a test post
        const postResponse = await api.post('/posts/create', {
            text: "Test post for API testing"
        });
        const postId = postResponse.data._id;
        console.log("\nCreated test post:", postId);

        // Test 2: Login as user2
        await api.post('/auth/login', {
            username: "testuser2",
            password: "password123"
        });
        console.log("Logged in as user2");

        // Test 3: Add a comment
        const commentResponse = await api.post(`/posts/${postId}/comment`, {
            text: "Test comment"
        });
        const commentId = commentResponse.data._id;
        console.log("\nAdded comment:", commentId);

        // Test 4: Like the comment
        await api.put(`/posts/${postId}/comment/${commentId}/like`);
        console.log("\nLiked comment");

        // Test 5: Repost the comment
        await api.post(`/comments/repost/${commentId}`);
        console.log("\nReposted comment");

        // Test 6: Bookmark the comment
        await api.post(`/comments/bookmark/${commentId}`);
        console.log("\nBookmarked comment");

        // Test 7: Add a reply to the comment
        const replyResponse = await api.post(`/posts/${postId}/comment`, {
            text: "Reply to test comment",
            parentComment: commentId
        });
        console.log("\nAdded reply:", replyResponse.data._id);

        // Test 8: Get the post with comments
        const postWithComments = await api.get(`/posts/${postId}`);
        console.log("\nPost with comments structure:", JSON.stringify(postWithComments.data, null, 2));

        // Test 9: Delete the comment
        await api.delete(`/posts/${postId}/comment/${commentId}`);
        console.log("\nDeleted comment");

        // Test 10: Delete the post
        await api.delete(`/posts/${postId}`);
        console.log("\nDeleted post");

        console.log("\n=== All API tests completed successfully ===");

    } catch (error) {
        console.error("Test failed:", error.response?.data || error.message);
    }
};

// Run the test
testCommentAPI(); 