import axios from 'axios';
import Post from '../models/post.model.js';
import User from '../models/user.model.js';
import Comment from '../models/comment.model.js';
import bcrypt from 'bcryptjs';
import Board from '../models/board.model.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

class LeechService {
    constructor() {
        this.apiBase = 'https://a.4cdn.org';
        this.imgBase = 'https://i.4cdn.org';
    }

    // Helper function to get proxied image URL
    getProxiedImageUrl(imageUrl) {
        if (!imageUrl) return null;
        try {
            // Encode the URL for use in query parameters
            const encodedUrl = encodeURIComponent(imageUrl);
            return `/api/proxy/4chan-image?url=${encodedUrl}`;
        } catch (error) {
            console.error('Error creating proxied image URL:', error);
            return null;
        }
    }

    // Fetch threads from 4chan catalog JSON API
    async fetch4chanThreads(board, catalog = 'catalog') {
        try {
            const url = `${this.apiBase}/${board}/catalog.json`;
            console.log(`[LeechService] Fetching catalog: ${url}`);
            const response = await axios.get(url, { timeout: 10000 });
            if (!response.data) throw new Error('No data received from 4chan API');

            // Flatten all threads from all pages
            const threads = response.data.flatMap(page => page.threads.map(thread => {
                const originalImageUrl = thread.tim && thread.ext ? `${this.imgBase}/${board}/${thread.tim}${thread.ext}` : null;
                return {
                    id: thread.no,
                    subject: thread.sub || '',
                    comment: thread.com ? thread.com.replace(/<br\s*\/?>(\n)?/g, '\n').replace(/<[^>]+>/g, '') : '',
                    replies: thread.replies || 0,
                    images: thread.images || 0,
                    timestamp: thread.time,
                    image: originalImageUrl ? this.getProxiedImageUrl(originalImageUrl) : null,
                    originalImageUrl // Keep the original URL for reference
                };
            }));

            console.log(`[LeechService] Fetched ${threads.length} threads from /${board}/`);
            return threads;
        } catch (error) {
            console.error('[LeechService] Error fetching 4chan catalog:', error);
            throw new Error(`Failed to fetch threads: ${error.message}`);
        }
    }

    // Fetch posts from a 4chan thread JSON API
    async fetchThreadContent(board, threadId) {
        try {
            const url = `${this.apiBase}/${board}/thread/${threadId}.json`;
            console.log('[LeechService] Fetching thread:', url);
            const response = await axios.get(url, { timeout: 10000 });

            if (!response.data || !response.data.posts) {
                console.error('[LeechService] Invalid thread data received:', response.data);
                throw new Error('Invalid thread data received');
            }

            console.log('[LeechService] Raw thread data:', {
                postsCount: response.data.posts.length,
                firstPost: response.data.posts[0] ? {
                    no: response.data.posts[0].no,
                    hasComment: !!response.data.posts[0].com,
                    commentLength: response.data.posts[0].com ? response.data.posts[0].com.length : 0,
                    hasImage: !!(response.data.posts[0].tim && response.data.posts[0].ext),
                    subject: response.data.posts[0].sub || null
                } : null
            });

            const posts = response.data.posts.map(post => {
                // Construct the full image URL if tim and ext are present
                const imageUrl = post.tim && post.ext ? 
                    `${this.imgBase}/${board}/${post.tim}${post.ext}` : null;

                const processedPost = {
                    no: post.no,
                    tim: post.tim,
                    ext: post.ext,
                    subject: post.sub || '',
                    comment: post.com ? post.com.replace(/<br\s*\/?>(\n)?/g, '\n').replace(/<[^>]+>/g, '') : '',
                    image: imageUrl,
                    timestamp: post.time
                };

                console.log('[LeechService] Processed post:', {
                    no: processedPost.no,
                    hasSubject: !!processedPost.subject,
                    hasComment: !!processedPost.comment,
                    commentLength: processedPost.comment.length,
                    hasImage: !!processedPost.image,
                    imageUrl: processedPost.image
                });

                return processedPost;
            });

            return { posts };
        } catch (error) {
            console.error('[LeechService] Error fetching thread content:', error);
            throw new Error(`Failed to fetch thread content: ${error.message}`);
        }
    }

    // Convert 4chan thread to a post
    async convertThreadToPost(board, threadId, { repostType, targetBoard, userId, threadUrl }) {
        try {
            console.log('[LeechService] Starting thread conversion:', {
                board,
                threadId,
                repostType,
                targetBoard,
                userId,
                threadUrl
            });

            // Validate user
            const user = await User.findById(userId);
            if (!user) {
                console.error('[LeechService] User not found:', userId);
                throw new Error('User not found');
            }

            // Fetch thread content
            const threadContent = await this.fetchThreadContent(board, threadId);
            if (!threadContent || !threadContent.posts || threadContent.posts.length === 0) {
                console.error('[LeechService] No thread content found:', { board, threadId });
                throw new Error('Thread not found or empty');
            }

            // Get the original post (first post in the thread)
            const originalThreadPost = threadContent.posts[0];

            // Validate required fields
            if (!originalThreadPost.comment) {
                console.error('[LeechService] Thread has no content:', originalThreadPost);
                throw new Error('Thread has no content');
            }

            // Get board name if it's a board post
            let boardName = null;
            if (repostType === 'board' && targetBoard) {
                const targetBoardDoc = await Board.findById(targetBoard);
                if (!targetBoardDoc) {
                    throw new Error('Target board not found');
                }
                boardName = targetBoardDoc.name;
            }

            // Handle image if present
            let uploadedImageUrl = null;
            let originalImageUrl = null;
            let imageProcessingResult = null;

            if (originalThreadPost.image) {
                try {
                    console.log('[LeechService] Processing image:', originalThreadPost.image);

                    // Download image from 4chan with proper headers
                    const imageResponse = await axios.get(originalThreadPost.image, {
                        responseType: 'arraybuffer',
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Connection': 'keep-alive',
                            'Referer': `https://boards.4channel.org/${board}/`
                        }
                    });

                    if (!imageResponse.data) {
                        throw new Error('No image data received');
                    }

                    console.log('[LeechService] Image downloaded successfully:', {
                        size: imageResponse.data.length,
                        contentType: imageResponse.headers['content-type'],
                        status: imageResponse.status
                    });

                    // Convert to base64
                    const base64Image = Buffer.from(imageResponse.data).toString('base64');
                    const dataURI = `data:${imageResponse.headers['content-type']};base64,${base64Image}`;

                    // Upload to Cloudinary with proper options
                    const uploadResponse = await cloudinary.uploader.upload(dataURI, {
                        folder: 'leech_images',
                        resource_type: 'auto',
                        timeout: 60000,
                        chunk_size: 6000000,
                        format: 'jpg',
                        quality: 'auto',
                        fetch_format: 'auto'
                    });

                    if (!uploadResponse || !uploadResponse.secure_url) {
                        throw new Error('No secure URL received from Cloudinary');
                    }

                    uploadedImageUrl = uploadResponse.secure_url;
                    originalImageUrl = originalThreadPost.image;

                    console.log('[LeechService] Image uploaded successfully:', {
                        originalUrl: originalImageUrl,
                        uploadedUrl: uploadedImageUrl,
                        format: uploadResponse.format,
                        size: uploadResponse.bytes
                    });

                    imageProcessingResult = {
                        success: true,
                        message: 'Image processed and uploaded successfully',
                        details: {
                            originalUrl: originalImageUrl,
                            uploadedUrl: uploadedImageUrl,
                            format: uploadResponse.format,
                            size: uploadResponse.bytes
                        }
                    };
                } catch (error) {
                    console.error('[LeechService] Error handling image:', error);
                    // Log the full error details
                    console.error('[LeechService] Error details:', {
                        message: error.message,
                        response: error.response?.data,
                        status: error.response?.status,
                        headers: error.response?.headers,
                        url: originalThreadPost.image
                    });
                    // Continue without image if there's an error
                    imageProcessingResult = {
                        success: false,
                        message: 'Failed to process image',
                        error: error.message
                    };
                    // Don't throw the error, just continue without the image
                }
            }

            // Create the post data
            const postData = {
                title: originalThreadPost.subject || `Thread #${threadId}`,
                text: originalThreadPost.comment + (originalImageUrl ? `\n\n[Source Image: ${originalImageUrl}]` : ''),
                user: userId,
                img: uploadedImageUrl, // This will be null if image processing failed
                board: repostType === 'board' ? targetBoard : null,
                boardName: boardName,
                isPersonal: repostType === 'personal',
                originalThreadUrl: threadUrl,
                originalPostNumber: originalThreadPost.no,
                isRepost: true,
                isThread: true,
                repostSource: {
                    type: '4chan',
                    board: board,
                    threadId: threadId,
                    url: threadUrl
                }
            };

            console.log('[LeechService] Creating post with data:', {
                hasTitle: !!postData.title,
                title: postData.title,
                hasText: !!postData.text,
                textLength: postData.text.length,
                hasUser: !!postData.user,
                userId: postData.user,
                hasImage: !!postData.img,
                imageUrl: postData.img,
                board: postData.board,
                boardName: postData.boardName,
                isPersonal: postData.isPersonal,
                isRepost: postData.isRepost,
                isThread: postData.isThread
            });

            // Create the post
            const post = await Post.create(postData);
            console.log('[LeechService] Post created:', {
                postId: post._id,
                isPersonal: post.isPersonal,
                board: post.board,
                boardName: post.boardName,
                hasImage: !!post.img,
                imageUrl: post.img
            });

            // If it's a board post, update the board's posts array and post count
            if (repostType === 'board' && targetBoard) {
                const updatedBoard = await Board.findByIdAndUpdate(
                    targetBoard,
                    {
                        $push: { posts: post._id },
                        $inc: { postCount: 1 }
                    },
                    { new: true }
                ).populate('posts');

                console.log('[LeechService] Updated board:', {
                    boardId: targetBoard,
                    postId: post._id,
                    newPostCount: updatedBoard.postCount,
                    totalPosts: updatedBoard.posts.length
                });

                // Update the post with the board's updated data
                post.board = updatedBoard;
            }

            return {
                success: true,
                data: {
                    post,
                    repliesCount: threadContent.posts.length - 1,
                    board: repostType === 'board' ? await Board.findById(targetBoard).populate('posts') : null,
                    imageProcessing: imageProcessingResult
                }
            };
        } catch (error) {
            console.error('[LeechService] Error converting thread:', error);
            throw error;
        }
    }

    // Helper method to get next thread ID
    async getNextThreadId() {
        try {
            const highestPost = await Post.findOne({}, {}, { sort: { 'threadId': -1 } });
            return highestPost ? highestPost.threadId + 1 : 1;
        } catch (error) {
            console.error('[LeechService] Error getting next thread ID:', error);
            throw new Error(`Failed to get next thread ID: ${error.message}`);
        }
    }
}

export default new LeechService();