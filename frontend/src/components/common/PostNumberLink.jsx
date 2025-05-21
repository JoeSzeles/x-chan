
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatPostNumber } from '../../utils/postNumberUtils';
import LoadingSpinner from './LoadingSpinner';
import QuoteText from './QuoteText';

const PostNumberLink = ({ postNumber, onQuoteClick }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const previewRef = useRef(null);
    const navigate = useNavigate();

    // Fetch post data when preview is shown
    const { data: postData, isLoading } = useQuery({
        queryKey: ['post', postNumber],
        queryFn: async () => {
            const res = await fetch(`/api/posts/number/${postNumber}`);
            if (!res.ok) throw new Error('Post not found');
            return res.json();
        },
        enabled: showPreview,
    });

    const handleMouseEnter = (e) => {
        setMousePosition({ x: e.clientX, y: e.clientY });
        setShowPreview(true);
    };

    const handleMouseLeave = () => {
        setShowPreview(false);
    };

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onQuoteClick) {
            onQuoteClick(postNumber);
        }
    };

    useEffect(() => {
        if (showPreview && previewRef.current) {
            const preview = previewRef.current;
            const rect = preview.getBoundingClientRect();
            
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
        <>
            <span
                className="text-blue-500 hover:text-blue-400 cursor-pointer"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
            >
                {`>>${formatPostNumber(postNumber)}`}
            </span>

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
        </>
    );
};

export default PostNumberLink;
