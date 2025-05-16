import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const usePostNumberNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handlePostNumberClick = async (postNumber, currentPostId) => {
        try {
            // First check if the referenced post is in the current view
            const referencedPost = document.querySelector(`[data-post-number="${postNumber}"]`);
            if (referencedPost) {
                // If found in current view, scroll to it and highlight
                referencedPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
                referencedPost.classList.add('highlight-post');
                setTimeout(() => {
                    referencedPost.classList.remove('highlight-post');
                }, 2000);
                return;
            }

            // If not found in current view, fetch the post from the server
            const res = await fetch(`/api/posts/number/${postNumber}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Post not found");
            }

            // Check if the post is a comment or reply
            if (data.parentPost) {
                // If it's a comment/reply in a different thread
                if (data.parentPost._id !== currentPostId) {
                    // Navigate to the parent post's thread
                    navigate(`/post/${data.parentPost._id}`, {
                        state: {
                            from: location.pathname,
                            scrollPosition: window.scrollY,
                            targetCommentId: data._id
                        }
                    });
                } else {
                    // If it's a comment/reply in the current thread
                    const commentElement = document.querySelector(`[data-comment-id="${data._id}"]`);
                    if (commentElement) {
                        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        commentElement.classList.add('highlight-post');
                        setTimeout(() => {
                            commentElement.classList.remove('highlight-post');
                        }, 2000);
                    } else {
                        // If comment element not found, update URL to include comment ID
                        navigate(`/post/${currentPostId}?comment=${data._id}`, {
                            state: {
                                from: location.pathname,
                                scrollPosition: window.scrollY,
                                targetCommentId: data._id
                            }
                        });
                    }
                }
            } else {
                // If it's a regular post, navigate to its thread
                navigate(`/post/${data._id}`, {
                    state: {
                        from: location.pathname,
                        scrollPosition: window.scrollY
                    }
                });
            }
        } catch (error) {
            console.error("Error navigating to post:", error);
            toast.error(error.message || "Failed to navigate to post");
        }
    };

    return { handlePostNumberClick };
};

export default usePostNumberNavigation; 