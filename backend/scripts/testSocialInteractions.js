import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000/api';

// Create axios instance with cookie handling
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Create a cookie jar to store cookies between requests
let cookies = [];

// Add response interceptor to save cookies
api.interceptors.response.use(response => {
    const setCookies = response.headers['set-cookie'];
    if (setCookies) {
        cookies = setCookies;
    }
    return response;
});

// Add request interceptor to send cookies
api.interceptors.request.use(config => {
    if (cookies.length > 0) {
        config.headers.Cookie = cookies.join('; ');
    }
    return config;
});

const testSocialInteractions = async () => {
    const errors = [];
    let postId, commentId, replyId;

    try {
        console.log("\n=== Starting Social Media Interaction Tests ===\n");

        // Test 1: Login as user1
        try {
            const loginResponse = await api.post('/auth/login', {
                username: "testuser1",
                password: "123456"
            });
            console.log("Login response:", loginResponse.data);
            console.log("Login cookies:", loginResponse.headers['set-cookie']);
            console.log("✓ Logged in as user1");
        } catch (error) {
            console.error("Login error:", error.response?.data || error.message);
            errors.push(`Login as user1 failed: ${error.response?.data?.error || error.message}`);
            return; // Exit if login fails
        }

        // Test 2: Create a post
        try {
            const postResponse = await api.post('/posts/create', {
                text: "Test post for social interactions"
            });
            postId = postResponse.data._id;
            console.log("✓ Created test post");
        } catch (error) {
            console.error("Create post error:", error.response?.data || error.message);
            errors.push(`Create post failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 3: Like the post
        try {
            await api.post(`/posts/like/${postId}`);
            console.log("✓ Liked post");
        } catch (error) {
            errors.push(`Like post failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 4: Repost the post
        try {
            await api.post(`/posts/repost/${postId}`);
            console.log("✓ Reposted post");
        } catch (error) {
            errors.push(`Repost post failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 5: Bookmark the post
        try {
            await api.post(`/bookmarks/${postId}`);
            console.log("✓ Bookmarked post");
        } catch (error) {
            errors.push(`Bookmark post failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 6: Login as user2
        try {
            await api.post('/auth/login', {
                username: "testuser2",
                password: "123456"
            });
            console.log("✓ Logged in as user2");
        } catch (error) {
            errors.push(`Login as user2 failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 7: Add a comment
        try {
            const commentResponse = await api.post(`/posts/comment/${postId}`, {
                text: "Test comment from user2"
            });
            commentId = commentResponse.data._id;
            console.log("✓ Added comment");
        } catch (error) {
            errors.push(`Add comment failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 8: Like the comment
        try {
            await api.put(`/posts/${postId}/comment/${commentId}/like`);
            console.log("✓ Liked comment");
        } catch (error) {
            errors.push(`Like comment failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 9: Repost the comment
        try {
            await api.post(`/posts/repost/${postId}`);
            console.log("✓ Reposted comment");
        } catch (error) {
            errors.push(`Repost comment failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 10: Bookmark the comment
        try {
            await api.post(`/bookmarks/${postId}`);
            console.log("✓ Bookmarked comment");
        } catch (error) {
            errors.push(`Bookmark comment failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 11: Login as user1 again
        try {
            await api.post('/auth/login', {
                username: "testuser1",
                password: "123456"
            });
            console.log("✓ Logged in as user1 again");
        } catch (error) {
            errors.push(`Login as user1 again failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 12: Add a reply to the comment
        try {
            const replyResponse = await api.post(`/posts/comment/${postId}`, {
                text: "Reply to comment from user1",
                parentComment: commentId
            });
            replyId = replyResponse.data._id;
            console.log("✓ Added reply");
        } catch (error) {
            errors.push(`Add reply failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 13: Like the reply
        try {
            await api.put(`/posts/${postId}/comment/${replyId}/like`);
            console.log("✓ Liked reply");
        } catch (error) {
            errors.push(`Like reply failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 14: Repost the reply
        try {
            await api.post(`/posts/repost/${postId}`);
            console.log("✓ Reposted reply");
        } catch (error) {
            errors.push(`Repost reply failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 15: Bookmark the reply
        try {
            await api.post(`/bookmarks/${postId}`);
            console.log("✓ Bookmarked reply");
        } catch (error) {
            errors.push(`Bookmark reply failed: ${error.response?.data?.error || error.message}`);
        }

        // Test 16: Get post with all interactions
        try {
            const postWithInteractions = await api.get(`/posts/${postId}`);
            console.log("\nPost with interactions structure:", JSON.stringify(postWithInteractions.data, null, 2));
            console.log("✓ Retrieved post with interactions");
        } catch (error) {
            errors.push(`Get post with interactions failed: ${error.response?.data?.error || error.message}`);
        }

        // Cleanup
        try {
            if (commentId) {
                await api.delete(`/posts/${postId}/comment/${commentId}`);
                console.log("✓ Deleted comment");
            }
            if (postId) {
                await api.delete(`/posts/${postId}`);
                console.log("✓ Deleted post");
            }
        } catch (error) {
            errors.push(`Cleanup failed: ${error.response?.data?.error || error.message}`);
        }

        // Print test summary
        console.log("\n=== Test Summary ===");
        if (errors.length > 0) {
            console.log("\nErrors encountered:");
            errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        } else {
            console.log("\n✓ All tests completed successfully!");
        }

    } catch (error) {
        console.error("Test failed:", error.response?.data || error.message);
    }
};

// Run the test
testSocialInteractions(); 