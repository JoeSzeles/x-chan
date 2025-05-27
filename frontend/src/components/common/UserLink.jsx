
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from './LoadingSpinner';

const UserLink = ({ username, onUserClick }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const previewRef = useRef(null);
    const navigate = useNavigate();

    // Fetch user data when preview is shown
    const { data: userData, isLoading } = useQuery({
        queryKey: ['user', username],
        queryFn: async () => {
            const res = await fetch(`/api/users/profile/${username}`);
            if (!res.ok) throw new Error('User not found');
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

    // Handle click
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onUserClick) {
            onUserClick(username);
        } else {
            navigate(`/profile/${username}`);
        }
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
        <>
            <span
                className="text-blue-400 hover:text-blue-300 cursor-pointer"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
            >
                @{username}
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
                    ) : userData ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <img
                                    src={userData.profileImg || "/avatar-placeholder.png"}
                                    alt={userData.username}
                                    className="w-12 h-12 rounded-full flex-shrink-0"
                                />
                                <div className="min-w-0">
                                    <p className="font-semibold truncate">{userData.fullName}</p>
                                    <p className="text-sm text-gray-400 truncate">@{userData.username}</p>
                                </div>
                            </div>
                            {userData.bio && (
                                <div className="text-sm text-gray-300 break-words">
                                    {userData.bio}
                                </div>
                            )}
                            <div className="flex gap-4 text-sm text-gray-400">
                                <span>{userData.following?.length || 0} Following</span>
                                <span>{userData.followers?.length || 0} Followers</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-red-500">User not found</p>
                    )}
                </div>
            )}
        </>
    );
};

export default UserLink;
