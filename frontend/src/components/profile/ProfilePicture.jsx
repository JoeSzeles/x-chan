import { useState, useRef } from 'react';
import { MdEdit } from "react-icons/md";
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();
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
            const response = await fetch('/api/users/upload/profile', {
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

            const data = await response.json();

            if (!data.success) {
                throw new Error('Failed to upload profile picture');
            }

            // Force refresh of the image by updating timestamp
            setImageVersion(Date.now());

            // Update the user data in the query cache immediately
            if (data.user) {
                queryClient.setQueryData(['authUser'], data.user);
                queryClient.setQueryData(['user', user.username], data.user);
                
                // Invalidate queries to trigger refetch
                queryClient.invalidateQueries({ queryKey: ['authUser'] });
                queryClient.invalidateQueries({ queryKey: ['user', user.username] });
            }

            // Update parent component with new profile image
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
            className="relative w-32 h-32 group -mt-16 ml-4"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative w-full h-full rounded-full border-4 border-[#1e1e1e] overflow-hidden bg-[#1e1e1e]">
                <img
                    src={getProfileImageUrl()}
                    alt="Profile"
                    className="w-full h-full object-contain object-center rounded-full"
                    onError={(e) => {
                        e.target.src = "/avatar-placeholder.png";
                    }}
                />

                {isMyProfile && (
                    <div
                        className={`absolute bottom-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <MdEdit className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>

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