import React from 'react';
import { formatPostNumber, formatTimestamp, getCountryFlag } from '../../utils/postNumberUtils';
import PostNumberLink from './PostNumberLink';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

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

    const handlePostNumberClick = (e) => {
        e.stopPropagation();
        const formattedNumber = formatPostNumber(displayPostNumber);
        const reference = `>>${formattedNumber}`;
        navigator.clipboard.writeText(reference).then(() => {
            toast.success('Post reference copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy post reference');
        });
    };

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
                >
                    No.{formatPostNumber(displayPostNumber)}
                </span>
            </div>

            {/* Quote references */}
            {quotedBy.length > 0 && (
                <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">Replies</span>
                    <div className="flex items-center gap-1">
                        {quotedBy.map((quoteNumber, index) => (
                            <React.Fragment key={quoteNumber}>
                                {index > 0 && <span className="text-gray-500">,</span>}
                                <PostNumberLink
                                    postNumber={quoteNumber}
                                    onQuoteClick={onQuoteClick}
                                />
                            </React.Fragment>
                        ))}
                    </div>
                </>
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