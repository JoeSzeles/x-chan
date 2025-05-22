import { useState, useRef } from 'react';
import { MdEdit } from "react-icons/md";
import { toast } from 'react-hot-toast';

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [profileImg, setProfileImg] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);

            // Create FormData to send the file
            const formData = new FormData();
            formData.append('profileImg', file);

            // Upload the image
            const response = await fetch('/api/users/upload/profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            // Check for non-JSON responses
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error('Invalid response format from server');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile picture');
            }

            if (data.user?.profileImg) {
                // Add a cache-busting parameter to force reload
                const cacheBust = `?t=${Date.now()}`;
                setProfileImg(data.user.profileImg + cacheBust);

                if (onUpdate) {
                    onUpdate({ type: 'image', content: data.user.profileImg });
                }
            }

            toast.success('Profile picture updated successfully');

        } catch (error) {
            console.error('Error updating profile picture:', error);
            toast.error(error.message || 'Failed to update profile picture');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div 
            className="relative -mt-16 ml-4 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="w-32 h-32 rounded-full border-4 border-[#1e1e1e] overflow-hidden bg-[#1e1e1e]">
                <img
                    src={profileImg || user?.profileImg || "/avatar-placeholder.png"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.src = "/avatar-placeholder.png";
                    }}
                    key={profileImg || user?.profileImg} // Force reload when image changes
                />
            </div>

            {isMyProfile && (
                <div
                    className={`absolute bottom-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => fileInputRef.current.click()}
                >
                    <MdEdit className="w-5 h-5 text-white" />
                </div>
            )}

            <input
                type="file"
                hidden
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default ProfilePicture;