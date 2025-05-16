import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import React from "react";

import Comment from "../common/Comment";
import LoadingSpinner from "../common/LoadingSpinner";
import Post from "../common/Post";

// Custom component for displaying a threaded comment layout
const ThreadedComment = ({ comment, postId, level = 0, onViewReplies, isLastInThread = true }) => {
    const commentOwner = typeof comment.user === 'object' ? comment.user : { username: 'unknown', fullName: 'Unknown User' };
    const hasReplies = comment.replies && comment.replies.length > 0;
    const queryClient = useQueryClient();
    
    // Track view count for replies
    useEffect(() => {
        const trackView = async () => {
            try {
                await fetch(`/api/comments/${comment._id}/view`, {
                    method: "POST",
                });
                // Update the local cache with the new view count
                queryClient.setQueryData(["comments", postId], (oldData) => {
                    if (!oldData) return oldData;
                    return oldData.map((c) => {
                        if (c._id === comment._id) {
                            return { ...c, viewCount: (c.viewCount || 0) + 1 };
                        }
                        return c;
                    });
                });
            } catch (error) {
                console.error("Error tracking view:", error);
            }
        };

        trackView();
    }, [comment._id, queryClient, postId]);
    
    return (
        <div className="threaded-comment relative">
            {/* Thread connector line for this comment */}
            {level > 0 && (
                <div 
                    className="absolute w-0.5 bg-gray-600" 
                    style={{ 
                        left: `${24 + (level - 1) * 40}px`,
                        top: '-16px',
                        height: isLastInThread ? '28px' : '100%' 
                    }}
                />
            )}
            
            <div className="flex">
                {/* Indentation based on nesting level */}
                {level > 0 && (
                    <div style={{ width: `${level * 40}px` }} className="flex-shrink-0"></div>
                )}
                
                <div className="flex-grow">
                    <Comment 
                        comment={comment} 
                        postId={postId}
                        parentCommentId={level > 0 ? comment.parentComment : null}
                    />
                </div>
            </div>
            
            {/* View more replies button */}
            {hasReplies && (
                <div className="flex">
                    <div style={{ width: `${(level + 1) * 40}px` }} className="flex-shrink-0 relative">
                        <div className="absolute right-0 top-0 h-full w-0.5 bg-gray-600"></div>
                    </div>
                    <button
                        onClick={() => onViewReplies(comment._id)}
                        className="text-blue-400 hover:underline text-sm mb-4"
                    >
                        {comment.replies.length > 3 
                            ? `Show all ${comment.replies.length} replies` 
                            : `Show ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
                    </button>
                </div>
            )}
        </div>
    );
};

const CommentThread = () => {
    const { postId, commentId } = useParams();
    const navigate = useNavigate();
    const [focusedComment, setFocusedComment] = useState(commentId);
    
    // Fetch the post
    const { data: post, isLoading: postLoading } = useQuery({
        queryKey: ["post", postId],
        queryFn: async () => {
            try {
                console.log("Fetching post:", postId);
                const res = await fetch(`/api/posts/${postId}`);
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Something went wrong");
                }
                console.log("Post data received:", data);
                return data;
            } catch (error) {
                console.error("Error fetching post:", error);
                throw new Error(error);
            }
        },
    });

    // Fetch the post's comments
    const { data: comments, isLoading: commentsLoading } = useQuery({
        queryKey: ["comments", postId],
        queryFn: async () => {
            try {
                console.log("Fetching comments for post:", postId);
                const res = await fetch(`/api/comments/${postId}`);
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Something went wrong");
                }
                console.log("Comments data received:", data);
                return data;
            } catch (error) {
                console.error("Error fetching comments:", error);
                throw new Error(error);
            }
        },
    });

    // Update focused comment when URL changes
    useEffect(() => {
        setFocusedComment(commentId);
    }, [commentId]);

    // Get the current comment path (for breadcrumb navigation)
    const findCommentPath = (commentList, targetId, path = []) => {
        if (!commentList) return null;
        
        for (const comment of commentList) {
            if (comment._id === targetId) {
                return [...path, comment];
            }
            
            if (comment.replies && comment.replies.length > 0) {
                const nestedPath = findCommentPath(comment.replies, targetId, [...path, comment]);
                if (nestedPath) return nestedPath;
            }
        }
        
        return null;
    };
    
    const commentPath = findCommentPath(comments, focusedComment);
    
    // Get the focused comment object
    const getFocusedComment = (commentList, targetId) => {
        if (!commentList) return null;
        
        // If we're in root view, return null
        if (targetId === postId) {
            return null;
        }
        
        for (const comment of commentList) {
            if (comment._id === targetId) {
                return comment;
            }
            
            if (comment.replies && comment.replies.length > 0) {
                const nestedComment = getFocusedComment(comment.replies, targetId);
                if (nestedComment) return nestedComment;
            }
        }
        
        return null;
    };
    
    const currentComment = getFocusedComment(comments, focusedComment);
    const isRootView = focusedComment === postId;
    
    // Handle clicking on a reply to navigate deeper
    const handleCommentClick = (clickedCommentId) => {
        setFocusedComment(clickedCommentId);
        navigate(`/post/${postId}/comment/${clickedCommentId}`, { replace: true });
    };
    
    if (postLoading || commentsLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <LoadingSpinner size="lg" />
            </div>
        );
    }
    
    if (!post) {
        return (
            <div className="p-4 text-center">
                <p>Post not found or has been deleted.</p>
                <button 
                    onClick={() => navigate('/')}
                    className="btn btn-primary mt-4"
                >
                    Return to Home
                </button>
            </div>
        );
    }
    
    return (
        <div className="comment-thread p-4 flex-[4_4_0] mr-auto border-r border-gray-700 min-h-screen">
            {/* Navigation header */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => navigate(`/post/${postId}`)}
                    className="p-2 rounded-full hover:bg-gray-800"
                >
                    <FaArrowLeft />
                </button>
                <h2 className="text-xl font-bold">
                    {isRootView ? "Thread" : "Reply Thread"}
                </h2>
            </div>

            {/* Original Post */}
            {post && (
                <div className="mb-6">
                    <Post post={post} />
                </div>
            )}
            
            {/* Enhanced Breadcrumb Navigation */}
            <div className="breadcrumbs-container mb-6">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                    {/* Original Post Link */}
                    <button
                        onClick={() => navigate(`/post/${postId}`)}
                        className="flex items-center gap-2 hover:text-blue-500 transition-colors whitespace-nowrap"
                    >
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                            <img 
                                src={post?.user?.profileImg || "/avatar-placeholder.png"} 
                                alt={post?.user?.username || "Original Post"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.src = "/avatar-placeholder.png";
                                }}
                            />
                        </div>
                        <span className="font-medium">Original Post</span>
                    </button>

                    {/* Thread Path */}
                    {commentPath && commentPath.length > 0 && (
                        <>
                            <span className="text-gray-500 flex-shrink-0">→</span>
                            {commentPath.map((comment, index) => (
                                <React.Fragment key={comment._id}>
                                    <button
                                        onClick={() => handleCommentClick(comment._id)}
                                        className="flex items-center gap-2 hover:text-blue-500 transition-colors whitespace-nowrap"
                                    >
                                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                            <img 
                                                src={comment.user?.profileImg || "/avatar-placeholder.png"} 
                                                alt={comment.user?.username || "Unknown User"}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = "/avatar-placeholder.png";
                                                }}
                                            />
                                        </div>
                                        <span className="font-medium">@{comment.user?.username || "Unknown User"}</span>
                                    </button>
                                    {index < commentPath.length - 1 && (
                                        <span className="text-gray-500 flex-shrink-0">→</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </>
                    )}
                </div>
                
                {/* Thread Level Indicator */}
                {commentPath && commentPath.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                        {commentPath.length} {commentPath.length === 1 ? 'reply' : 'replies'} deep
                    </div>
                )}
            </div>
            
            {/* Show all comments in root view */}
            {isRootView && comments && comments.length > 0 && (
                <div className="comments-list mt-4">
                    <h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">
                        Comments ({comments.length})
                    </h3>
                    <div className="threaded-comments">
                        {comments.map((comment, index) => (
                            <ThreadedComment
                                key={comment._id}
                                comment={comment}
                                postId={postId}
                                level={0}
                                onViewReplies={handleCommentClick}
                                isLastInThread={index === comments.length - 1}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {/* Show focused comment and its replies when not in root view */}
            {!isRootView && currentComment && (
                <>
                    <div className="mb-6 current-comment">
                        <Comment 
                            comment={currentComment} 
                            postId={postId}
                            parentCommentId={currentComment.parentComment}
                        />
                    </div>
                    
                    {/* Replies to current comment */}
                    {currentComment.replies && currentComment.replies.length > 0 && (
                        <div className="replies-thread mt-4">
                            <h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">
                                Replies ({currentComment.replies.length})
                            </h3>
                            
                            <div className="threaded-comments">
                                {currentComment.replies.map((reply, index) => (
                                    <ThreadedComment
                                        key={reply._id}
                                        comment={reply}
                                        postId={postId}
                                        level={1}
                                        onViewReplies={handleCommentClick}
                                        isLastInThread={index === currentComment.replies.length - 1}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Empty state for no replies */}
                    {(!currentComment.replies || currentComment.replies.length === 0) && (
                        <div className="empty-replies text-center py-8 border-t border-gray-700 mt-4">
                            <p className="text-gray-500">No replies yet</p>
                            <p className="text-sm text-gray-600 mt-2">Be the first to reply to this comment</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CommentThread; 