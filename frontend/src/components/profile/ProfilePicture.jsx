import { useState, useRef } from 'react';
import { MdEdit } from "react-icons/md";
import { toast } from 'react-hot-toast';

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);
    // Use a state to force image refresh when updated
    const [imageVersion, setImageVersion] = useState(Date.now());

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);

            // Create FormData to send the file
            const formData = new FormData();
            formData.append('profileImg', file);

            // Upload the image
            const response = await fetch('/api/upload/profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                const text = await response.text();
                console.error('Error response:', text);
                throw new Error('Failed to upload profile picture');
            }

            // Parse the JSON response
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to upload profile picture');
            }

            // Force refresh of the image by updating timestamp
            setImageVersion(Date.now());

            // Update the parent component if callback provided
            if (onUpdate && data.user?.profileImg) {
                onUpdate({ type: 'image', content: data.user.profileImg });
            }

            toast.success('Profile picture updated successfully');

        } catch (error) {
            console.error('Error updating profile picture:', error);
            toast.error(error.message || 'Failed to upload profile picture');
        } finally {
            setIsUploading(false);
        }
    };

    // Get the profile image URL with cache busting
    const getProfileImageUrl = () => {
        const baseUrl = user?.profileImg || "/avatar-placeholder.png";
        return baseUrl.includes('?') 
            ? `${baseUrl}&v=${imageVersion}` 
            : `${baseUrl}?v=${imageVersion}`;
    };

    return (
        <div 
            className="relative -mt-16 ml-4 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="w-32 h-32 rounded-full border-4 border-[#1e1e1e] overflow-hidden bg-[#1e1e1e]">
                <img
                    src={getProfileImageUrl()}
                    alt="Profile"
                    className="w-full h-full object-cover object-center"
                    style={{
                        objectFit: 'cover',
                        width: '100%',
                        height: '100%'
                    }}
                    onError={(e) => {
                        e.target.src = "/avatar-placeholder.png";
                    }}
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