
import React, { useState, useEffect, useRef } from 'react';
import { formatPostNumber, formatTimestamp, getCountryFlag } from '../../utils/postNumberUtils';
import PostNumberLink from './PostNumberLink';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from './LoadingSpinner';
import QuoteText from './QuoteText';

const PostNumberHeader = ({ 
    post, 
    onQuoteClick,
    quotedBy = [], // Array of post numbers that quoted this post
    postNumber, // Direct post number prop for backward compatibility
    userId, // Direct user ID prop for backward compatibility
    isAnonymous = false, // Direct anonymous flag for backward compatibility
    timestamp, // Direct timestamp prop for backward compatibility
    userProfile, // Direct user profile prop for backward compatibility
    ipAddress, // Direct IP address prop for backward compatibility
    className = '' // Additional CSS classes
}) => {
    const formatTimeAgo = (date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
    };

    // Use either post object or individual props
    const displayPostNumber = post?.postNumber || postNumber;
    const displayUserId = post?.user?._id || userId;
    const displayTimestamp = post?.createdAt || timestamp;
    const displayUserProfile = post?.user || userProfile;
    const displayCountry = post?.user?.location?.countryCode || userProfile?.location?.countryCode;

    if (!displayPostNumber) {
        console.warn('PostNumberHeader: No post number provided');
        return null;
    }

    const [showPreview, setShowPreview] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const previewRef = useRef(null);

    // Fetch post data when preview is shown
    const { data: postData, isLoading } = useQuery({
        queryKey: ['post', displayPostNumber],
        queryFn: async () => {
            const res = await fetch(`/api/posts/number/${displayPostNumber}`);
            if (!res.ok) throw new Error('Post not found');
            return res.json();
        },
        enabled: showPreview,
    });

    // Handle mouse enter
    const handleMouseEnter = (e) => {
        setMousePosition({ x: e.clientX, y: e.clientY });
        setShowPreview(true);
    };

    // Handle mouse leave
    const handleMouseLeave = () => {
        setShowPreview(false);
    };

    const handlePostNumberClick = (e) => {
        e.stopPropagation();

        if (onQuoteClick) {
            // If onQuoteClick is provided, use it for the primary click action
            onQuoteClick(displayPostNumber);
            return;
        }

        // Default behavior: copy to clipboard
        const formattedNumber = formatPostNumber(displayPostNumber);
        const reference = `>>${formattedNumber}`;
        navigator.clipboard.writeText(reference).then(() => {
            toast.success('Post reference copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy post reference');
        });
    };

    // Update preview position
    useEffect(() => {
        if (showPreview && previewRef.current) {
            const preview = previewRef.current;
            const rect = preview.getBoundingClientRect();

            // Check if preview would go off screen
            if (mousePosition.x + rect.width > window.innerWidth) {
                preview.style.left = `${mousePosition.x - rect.width}px`;
            } else {
                preview.style.left = `${mousePosition.x}px`;
            }

            if (mousePosition.y + rect.height > window.innerHeight) {
                preview.style.top = `${mousePosition.y - rect.height}px`;
            } else {
                preview.style.top = `${mousePosition.y}px`;
            }
        }
    }, [showPreview, mousePosition]);

    return (
        <div className={`flex flex-wrap items-center gap-2 text-sm text-gray-400 ${className}`}>
            {/* Main post info */}
            <div className="flex items-center gap-2">
                <span>ID:{isAnonymous ? 'Anonymous' : (displayUserId?.slice(-4) || '0000')}</span>
                {displayCountry && (
                    <span>
                        <img 
                            src={`https://flagcdn.com/w20/${displayCountry.toLowerCase()}.png`}
                            alt={`${displayCountry} flag`}
                            className="inline-block w-4 h-3 rounded-sm"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </span>
                )}
                <span>•</span>
                <span>{formatTimeAgo(displayTimestamp)}</span>
                <span>•</span>
                <span 
                    className="cursor-pointer hover:text-blue-400 transition-colors"
                    onClick={handlePostNumberClick}
                    title={onQuoteClick ? "Click to quote this post" : "Click to copy reference"}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    No.{formatPostNumber(displayPostNumber)}
                </span>
            </div>

            {/* Quote references */}
            {quotedBy.length > 0 && (
                <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">Replies</span>
                    {quotedBy.map((quoteNumber, index) => (
                        <PostNumberLink
                            key={quoteNumber}
                            postNumber={quoteNumber}
                            onQuoteClick={onQuoteClick}
                        />
                    ))}
                </>
            )}
             
            {/* Post Preview */}
            {showPreview && (
                <div
                    ref={previewRef}
                    className="fixed z-50 bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-lg p-4 max-w-md w-[300px]"
                    style={{
                        transform: 'translate(10px, 10px)',
                        pointerEvents: 'none'
                    }}
                >
                    {isLoading ? (
                        <LoadingSpinner size="sm" />
                    ) : postData ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <img
                                    src={postData.user?.profileImg || "/avatar-placeholder.png"}
                                    alt={postData.user?.username}
                                    className="w-8 h-8 rounded-full flex-shrink-0"
                                />
                                <div className="min-w-0">
                                    <p className="font-semibold truncate">{postData.user?.fullName}</p>
                                    <p className="text-sm text-gray-400 truncate">@{postData.user?.username}</p>
                                </div>
                            </div>
                            <div className="break-words break-all whitespace-pre-wrap overflow-hidden">
                                <QuoteText text={postData.text} onQuoteClick={onQuoteClick} />
                            </div>
                            {postData.img && (
                                <img
                                    src={postData.img}
                                    alt="Post media"
                                    className="max-h-40 rounded-lg object-contain w-full"
                                />
                            )}
                        </div>
                    ) : (
                        <p className="text-red-500">Post not found</p>
                    )}
                </div>
            )}
        </div>
    );
};

PostNumberHeader.propTypes = {
    post: PropTypes.shape({
        postNumber: PropTypes.number,
        user: PropTypes.shape({
            _id: PropTypes.string,
            country: PropTypes.string
        }),
        createdAt: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.instanceOf(Date)
        ])
    }),
    onQuoteClick: PropTypes.func,
    quotedBy: PropTypes.arrayOf(PropTypes.number),
    postNumber: PropTypes.number,
    userId: PropTypes.string,
    isAnonymous: PropTypes.bool,
    timestamp: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date)
    ]),
    userProfile: PropTypes.object,
    ipAddress: PropTypes.string,
    className: PropTypes.string
};

export default PostNumberHeader;
