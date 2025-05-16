import axios from 'axios';
import Post from '../models/post.model.js';
import Comment from '../models/comment.model.js';
import User from '../models/user.model.js';
import Board from '../models/board.model.js';

export class FourChanConverter {
    constructor() {
        this.apiBaseUrl = 'https://a.4cdn.org';
        this.imageBaseUrl = 'https://i.4cdn.org';
    }

    async convertThread(board, threadId, userId, targetBoardId = null) {
        try {
            // Validate userId
            if (!userId) {
                throw new Error('User ID is required');
            }

            console.log('[FourChanConverter] Starting thread conversion:', {
                board,
                threadId,
                userId,
                targetBoardId
            });

            // Fetch thread content
            const threadContent = await this.fetchThreadContent(board, threadId);
            if (!threadContent || !threadContent.posts || threadContent.posts.length === 0) {
                throw new Error('No thread content found');
            }

            // Get the original post (first post in the thread)
            const originalPost = threadContent.posts[0];
            
            // Validate required fields
            if (!originalPost.comment) {
                console.error('[FourChanConverter] Thread has no content:', originalPost);
                throw new Error('Thread has no content');
            }

            console.log('[FourChanConverter] Creating post with data:', {
                userId,
                hasComment: !!originalPost.comment,
                commentLength: originalPost.comment.length
            });
            
            // Create the main post
            const postData = {
                text: originalPost.comment || '',  // Ensure text is never undefined
                user: userId,  // Use user instead of userId
                img: originalPost.image ? `${this.imageBaseUrl}/${board}/${originalPost.tim}${originalPost.ext}` : null,
                originalThreadUrl: `https://boards.4channel.org/${board}/thread/${threadId}`,
                metadata: {
                    source: '4chan',
                    board: board,
                    threadId: threadId,
                    replies: threadContent.posts.length - 1,
                    images: threadContent.posts.filter(p => p.image).length
                }
            };

            console.log('[FourChanConverter] Post data to be created:', {
                hasText: !!postData.text,
                textLength: postData.text.length,
                hasUser: !!postData.user,
                userId: postData.user,
                hasImage: !!postData.img
            });

            // If target board is specified, add it to the post data
            if (targetBoardId) {
                const targetBoard = await Board.findById(targetBoardId);
                if (!targetBoard) {
                    throw new Error('Target board not found');
                }
                postData.board = targetBoardId;
            }

            // Create the post
            const post = await Post.create(postData);

            // Convert replies to comments
            const replies = threadContent.posts.slice(1); // Skip the original post
            for (const reply of replies) {
                const commentData = {
                    content: reply.comment,
                    imageUrl: reply.image ? `${this.imageBaseUrl}/${board}/${reply.tim}${reply.ext}` : null,
                    userId: userId,
                    postId: post._id,
                    metadata: {
                        source: '4chan',
                        board: board,
                        threadId: threadId,
                        replyId: reply.no
                    }
                };

                await Comment.create(commentData);
            }

            return {
                success: true,
                data: {
                    post,
                    repliesCount: replies.length
                }
            };
        } catch (error) {
            console.error('[FourChanConverter] Error converting thread:', error);
            throw error;
        }
    }

    async fetchThreadContent(board, threadId) {
        try {
            console.log('[FourChanConverter] Fetching thread content:', { board, threadId });
            const response = await axios.get(`${this.apiBaseUrl}/${board}/thread/${threadId}.json`);
            
            if (!response.data || !response.data.posts) {
                console.error('[FourChanConverter] Invalid thread data received:', response.data);
                throw new Error('Invalid thread data received');
            }

            console.log('[FourChanConverter] Raw thread data:', {
                postsCount: response.data.posts.length,
                firstPost: response.data.posts[0] ? {
                    no: response.data.posts[0].no,
                    hasComment: !!response.data.posts[0].com,
                    commentLength: response.data.posts[0].com ? response.data.posts[0].com.length : 0,
                    hasImage: !!(response.data.posts[0].tim && response.data.posts[0].ext)
                } : null
            });

            const posts = response.data.posts.map(post => {
                const processedPost = {
                    no: post.no,
                    tim: post.tim,
                    ext: post.ext,
                    comment: post.com ? post.com.replace(/<br\s*\/?>(\n)?/g, '\n').replace(/<[^>]+>/g, '') : '',
                    image: post.tim && post.ext,
                    timestamp: post.time
                };
                
                console.log('[FourChanConverter] Processed post:', {
                    no: processedPost.no,
                    hasComment: !!processedPost.comment,
                    commentLength: processedPost.comment.length,
                    hasImage: !!processedPost.image
                });
                
                return processedPost;
            });

            return { posts };
        } catch (error) {
            console.error('[FourChanConverter] Error fetching thread content:', error);
            throw error;
        }
    }
} 