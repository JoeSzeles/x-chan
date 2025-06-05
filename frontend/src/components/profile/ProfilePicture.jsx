
import { useState, useRef } from 'react';
import { MdEdit } from "react-icons/md";
import { FaEnvelope } from "react-icons/fa";
import { toast } from 'react-hot-toast';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from 'react-router-dom';

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const { data: authUser } = useQuery({ queryKey: ["authUser"] });

    // Use the same online users API as WhosOnline
    const { data: onlineUsers } = useQuery({
        queryKey: ["onlineUsers"],
        queryFn: async () => {
            const res = await fetch('/api/users/online');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch online users");
            return data;
        },
        enabled: !!authUser,
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const isOnline = onlineUsers?.some(onlineUser => onlineUser._id === user._id);

    const userWithUpdatedImage = {
        ...user,
        profileImg: user.profileImg || "/avatar-placeholder.png"
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be smaller than 5MB');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('profileImg', file);

        try {
            const response = await fetch('/api/users/update', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update profile picture');
            }

            const data = await response.json();
            toast.success('Profile picture updated successfully!');
            
            if (onUpdate) {
                onUpdate(data.user);
            }
        } catch (error) {
            console.error('Error updating profile picture:', error);
            toast.error(error.message || 'Failed to update profile picture');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleStartConversation = async () => {
        try {
            const response = await fetch('/api/messages/start-conversation', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user._id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start conversation');
            }

            const conversation = await response.json();
            navigate('/messages', { state: { selectedConversation: conversation } });
        } catch (err) {
            console.error('Error starting conversation:', err);
            toast.error(`Error starting conversation: ${err.message}`);
        }
    };

    return (
        <div 
            className="relative -mt-16 ml-4 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Profile Picture with Online Status - positioned exactly like WhosOnline */}
            <div className="relative w-32 h-32 border-4 border-[#1e1e1e] rounded-full overflow-hidden bg-[#1e1e1e]">
                <img 
                    src={userWithUpdatedImage.profileImg} 
                    className="w-full h-full object-cover" 
                    alt={user.fullName || user.username}
                    onError={(e) => {
                        e.target.src = "/avatar-placeholder.png";
                    }}
                />
                
                {/* Online Status Indicator - positioned ON TOP like WhosOnline */}
                <div 
                    className={`absolute bottom-2 right-2 w-6 h-6 border-2 border-[#1e1e1e] rounded-full ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    style={{ 
                        filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))'
                    }}
                ></div>
            </div>

            {/* Edit Profile Picture Icon - Top of image */}
            {isMyProfile && (
                <div
                    className={`absolute top-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <MdEdit className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Message Icon - Only show for other users */}
            {!isMyProfile && authUser && (
                <div
                    className={`absolute top-2 left-2 rounded-full p-2 bg-blue-600 bg-opacity-75 cursor-pointer transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    onClick={handleStartConversation}
                >
                    <FaEnvelope className="w-4 h-4 text-white" />
                </div>
            )}

            {/* File Input */}
            {isMyProfile && (
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            )}

            {/* Loading Overlay */}
            {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
            )}
        </div>
    );
};

export default ProfilePicture;
