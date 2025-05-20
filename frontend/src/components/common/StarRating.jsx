
import { useState } from "react";
import { FaStar } from "react-icons/fa";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import LoadingSpinner from "./LoadingSpinner";

const StarRating = ({ post, currentUser, isComment = false }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const queryClient = useQueryClient();
    const userRating = post?.ratings?.find(r => r.user === currentUser?._id)?.rating || 0;
    const averageRating = post?.ratings?.length 
        ? (post.ratings.reduce((sum, r) => sum + r.rating, 0) / post.ratings.length).toFixed(1)
        : 0;

    const { mutate: rateItem, isPending: isRating } = useMutation({
        mutationFn: async (rating) => {
            if (!currentUser?._id) {
                throw new Error("Authentication required");
            }

            const endpoint = isComment 
                ? `/api/comments/rate/${post._id}`
                : `/api/posts/rate/${post._id}`;

            const res = await fetch(endpoint, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ rating }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update rating");
            }

            return res.json();
        },
        onSuccess: (data) => {
            if (isComment) {
                queryClient.setQueryData(["comments", post.post], (oldData) => {
                    if (!oldData) return [];
                    const updateRatingsInComment = (comments) => {
                        return comments.map((c) => {
                            if (c._id === post._id) {
                                return { ...c, ratings: data.ratings || [] };
                            }
                            if (c.replies && c.replies.length > 0) {
                                return {
                                    ...c,
                                    replies: updateRatingsInComment(c.replies)
                                };
                            }
                            return c;
                        });
                    };
                    return updateRatingsInComment(oldData);
                });

                queryClient.setQueryData(["comment", post._id], (oldData) => {
                    if (!oldData) return null;
                    return { ...oldData, ratings: data.ratings || [] };
                });
            } else {
                queryClient.setQueryData(["post", post._id], (oldData) => {
                    if (!oldData) return null;
                    return { ...oldData, ratings: data.ratings || [] };
                });

                queryClient.setQueryData(["posts"], (oldData) => {
                    if (!oldData) return [];
                    return oldData.map((p) => {
                        if (p._id === post._id) {
                            return { ...p, ratings: data.ratings || [] };
                        }
                        return p;
                    });
                });
            }

            toast.success(data.message || "Rating updated successfully");
        },
        onError: (error) => {
            if (error.message === "Authentication required") {
                toast.error("Please login to rate", {
                    icon: '🔒',
                    duration: 2000
                });
            } else {
                toast.error(error.message || "Failed to update rating");
            }
        },
    });

    const handleRating = (rating) => {
        if (!currentUser?._id) {
            toast.error("Please login to rate", {
                icon: '🔒',
                duration: 2000
            });
            return;
        }
        
        if (userRating > 0) {
            return; // Prevent multiple ratings
        }
        
        rateItem(rating);
    };

    return (
        <div className="flex items-center gap-1">
            {isRating ? (
                <LoadingSpinner size="sm" />
            ) : (
                <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            className="relative"
                            onMouseEnter={() => !userRating && setHoverRating(star)}
                            onMouseLeave={() => !userRating && setHoverRating(0)}
                            onClick={() => handleRating(star)}
                            disabled={isRating || userRating > 0}
                        >
                            <FaStar
                                className={`w-4 h-4 ${userRating > 0 ? 'cursor-default' : 'cursor-pointer'} ${
                                    (hoverRating || userRating) >= star
                                        ? "text-yellow-500"
                                        : "text-slate-500"
                                }`}
                            />
                        </button>
                    ))}
                </div>
            )}
            <span className="text-sm text-slate-500">
                ({post?.ratings?.length || 0})
            </span>
            {averageRating > 0 && (
                <span className="text-sm text-slate-500 ml-1">
                    {averageRating}
                </span>
            )}
        </div>
    );
};

export default StarRating;
