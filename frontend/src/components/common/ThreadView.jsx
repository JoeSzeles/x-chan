
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "./LoadingSpinner";
import Comment from "./Comment";
import Post from "./Post";
import { FaArrowLeft } from "react-icons/fa";
import PostPopup from "./PostPopup";
import { toast } from "react-hot-toast";

const ThreadView = () => {
    const { postId, commentId } = useParams();
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [focusedComment, setFocusedComment] = useState(commentId);
    const [commentPath, setCommentPath] = useState([]);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Fetch post data
    const { data: post, isLoading: postLoading } = useQuery({
        queryKey: ["post", postId],
        queryFn: async () => {
            try {
                const res = await fetch(`/api/posts/${postId}`);
                if (!res.ok) throw new Error("Failed to fetch post");
                return res.json();
            } catch (error) {
                console.error("Error fetching posts:", error);
                throw error;
            }
        },
    });

    // Fetch comments data
    const { data: comments = [], isLoading: commentsLoading } = useQuery({
        queryKey: ["comments", postId],
        queryFn: async () => {
            try {
                const res = await fetch(`/api/comments/${postId}`);
                if (!res.ok) throw new Error("Failed to fetch comments");
                return res.json();
            } catch (error) {
                console.error("Error fetching comments:", error);
                return [];
            }
        },
        enabled: !!postId,
    });

    // Build comment path when focused comment changes
    useEffect(() => {
        if (!comments?.length || !focusedComment) return;

        const buildPath = (commentList, targetId, path = []) => {
            for (const comment of commentList) {
                if (comment._id === targetId) {
                    return [...path, comment];
                }
                if (comment.replies?.length) {
                    const found = buildPath(comment.replies, targetId, [...path, comment]);
                    if (found) return found;
                }
            }
            return null;
        };

        const path = buildPath(comments, focusedComment);
        setCommentPath(path || []);
    }, [comments, focusedComment]);

    // Find the focused comment in the comment tree
    const findComment = (commentList, targetId) => {
        for (const comment of commentList || []) {
            if (comment._id === targetId) return comment;
            if (comment.replies?.length) {
                const found = findComment(comment.replies, targetId);
                if (found) return found;
            }
        }
        return null;
    };

    const currentComment = focusedComment && comments?.length 
        ? findComment(comments, focusedComment) 
        : null;

    if (postLoading || commentsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="p-4 text-center">
                <p>Post not found or has been deleted.</p>
                <button onClick={() => navigate('/')} className="btn btn-primary mt-4">
                    Return to Home
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 border-r border-gray-700 min-h-screen w-full">
            {/* Back Button */}
            <div className="sticky top-0 z-10 bg-background-main py-2 border-b border-gray-700">
                <button
                    onClick={() => navigate(`/post/${postId}`)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <FaArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
            </div>

            <div className="flex gap-4 px-4 w-full">
                {/* Left Side - Profile Pictures */}
                <div className="w-16 flex-shrink-0 flex flex-col items-center gap-2 pt-4">
                    {/* Original Post Author */}
                    <div className="w-[60px] h-[60px] relative z-10 rounded-full bg-[#1e1e1e] p-0.5">
                        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-700 group relative">
                            <img 
                                src={post.user?.profileImg || "/avatar-placeholder.png"}
                                className="w-full h-full object-cover" 
                                alt={post.user?.username}
                                onError={(e) => {
                                    e.target.src = "/avatar-placeholder.png";
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-w-0 max-w-full">
                    {/* Comment Path Navigation */}
                    {commentPath?.length > 0 && (
                        <div className="comment-path bg-gray-800 p-4 rounded-lg mb-6">
                            <div className="flex items-center gap-3 overflow-x-auto pb-2">
                                <button
                                    onClick={() => setFocusedComment(null)}
                                    className="flex items-center gap-2 min-w-fit hover:text-blue-400 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-700">
                                        <img
                                            src={post.user?.profileImg || "/avatar-placeholder.png"}
                                            alt="Original Post"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span>Original Post</span>
                                </button>

                                {commentPath.map((comment, index) => (
                                    <React.Fragment key={comment._id}>
                                        <span className="text-gray-500">→</span>
                                        <button
                                            onClick={() => setFocusedComment(comment._id)}
                                            className="flex items-center gap-2 min-w-fit hover:text-blue-400 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-700">
                                                <img
                                                    src={comment.user?.profileImg || "/avatar-placeholder.png"}
                                                    alt={comment.user?.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <span>@{comment.user?.username}</span>
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>

                            <div className="text-sm text-gray-400 mt-2">
                                {commentPath.length} level{commentPath.length === 1 ? '' : 's'} deep
                            </div>
                        </div>
                    )}

                    {/* Original Post */}
                    {!focusedComment && <Post post={post} />}

                    {/* Focused Comment or Comments List */}
                    {focusedComment ? (
                        <div className="mt-4">
                            {currentComment && (
                                <Comment
                                    comment={currentComment}
                                    postId={postId}
                                    disableNavigation={true}
                                />
                            )}
                        </div>
                    ) : comments?.length > 0 ? (
                        <div className="comments-list mt-4">
                            <h3 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">
                                Comments ({comments.length})
                            </h3>
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <Comment
                                        key={comment._id}
                                        comment={comment}
                                        postId={postId}
                                        onClick={() => setFocusedComment(comment._id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 text-center text-gray-500">
                            No comments yet
                        </div>
                    )}
                </div>
            </div>

            {/* Reply Popup */}
            {showReplyInput && (
                <PostPopup
                    onClose={() => setShowReplyInput(false)}
                    postId={postId}
                    isComment={true}
                    onSubmit={() => {
                        queryClient.invalidateQueries(["comments", postId]);
                        setShowReplyInput(false);
                    }}
                    parentComment={focusedComment !== postId ? focusedComment : null}
                />
            )}
        </div>
    );
};

export default ThreadView;
