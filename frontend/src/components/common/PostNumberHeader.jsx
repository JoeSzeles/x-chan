import React from 'react';
import PropTypes from 'prop-types';
import { formatPostNumber } from '../../utils/postNumberUtils';
import { formatPostDate } from '../../utils/date';
import PostNumberLink from './PostNumberLink';

const PostNumberHeader = ({ post, onQuoteClick, quotedBy, className = '' }) => {
    return (
        <div className={`flex flex-wrap gap-2 items-center text-sm font-mono ${className}`}>
            <span className="text-gray-500">No.</span>
            <span className="text-blue-400">{formatPostNumber(post.postNumber)}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-500">{formatPostDate(post.createdAt)}</span>
            {post.user?.location?.countryCode && (
                <>
                    <span className="text-gray-500">•</span>
                    <span className="flex items-center gap-1">
                        <img
                            src={`https://flagcdn.com/w20/${post.user.location.countryCode.toLowerCase()}.png`}
                            alt={`${post.user.location.countryCode} flag`}
                            className="inline-block w-4 h-3 rounded-sm"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                        <span className="text-gray-500">{post.user.location.countryCode}</span>
                    </span>
                </>
            )}
            {quotedBy?.length > 0 && (
                <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">Replies:</span>
                    <div className="flex flex-wrap gap-1">
                        {quotedBy.map((quoteNumber, index) => (
                            <PostNumberLink
                                key={quoteNumber}
                                postNumber={quoteNumber}
                                onQuoteClick={onQuoteClick}
                            />
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
            location: PropTypes.shape({
                countryCode: PropTypes.string
            })
        }),
        createdAt: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.instanceOf(Date)
        ])
    }),
    onQuoteClick: PropTypes.func,
    quotedBy: PropTypes.arrayOf(PropTypes.number),
    className: PropTypes.string
};

export default PostNumberHeader;