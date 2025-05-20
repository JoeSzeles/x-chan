import { useState } from "react";
import { FaStar } from "react-icons/fa";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import LoadingSpinner from "./LoadingSpinner";

const StarRating = ({ post, currentUser, isComment = false }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const queryClient = useQueryClient();
    const userRating = post.ratings?.find(r => r.user === currentUser?._id)?.rating || 0;
    const averageRating = post.ratings?.length 
        ? (post.ratings.reduce((sum, r) => sum + r.rating, 0) / post.ratings.length).toFixed(1)
        : 0;

    const { mutate: rateItem } = useMutation({
        mutationFn: async (rating) => {
            try {
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
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Something went wrong");
                }
                return data;
            } catch (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: (data) => {
            if (isComment) {
                // Update comments cache
                queryClient.setQueryData(["comments", post.post], (oldData) => {
                    if (!oldData) return [];
                    
                    // Function to update ratings in a comment or its replies
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

                // Update individual comment cache if it exists
                queryClient.setQueryData(["comment", post._id], (oldData) => {
                    if (!oldData) return null;
                    return { ...oldData, ratings: data.ratings || [] };
                });
            } else {
                // Update posts cache
                queryClient.setQueryData(["post", post._id], (oldData) => {
                    if (!oldData) return null;
                    return { ...oldData, ratings: data.ratings || [] };
                });

                // Also update the posts list cache if it exists
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

            toast.success(data.message || (data.isUpdate ? "Rating updated successfully" : "Rating added successfully"));
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update rating");
        },
    });

    const handleRating = (rating) => {
        if (!currentUser?._id) {
            toast.error("Please login to rate");
            return;
        }
        rateItem(rating);
    };

    return (
        <div className="flex items-center gap-1">
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
            <span className="text-sm text-slate-500">
                ({post.ratings?.length || 0})
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