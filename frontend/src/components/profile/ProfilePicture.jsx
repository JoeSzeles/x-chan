
import { useState, useRef } from 'react';
import { MdEdit } from "react-icons/md";
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);
    const [imageVersion, setImageVersion] = useState(Date.now());
    const queryClient = useQueryClient();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);

            // Create FormData to send the file
            const formData = new FormData();
            formData.append('profileImg', file);

            // Upload the image to the correct endpoint
            const response = await fetch('/api/users/upload/profile', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload profile picture');
            }

            const data = await response.json();

            if (!data.success || !data.user) {
                throw new Error('Invalid response from server');
            }

            // Force refresh of the image by updating timestamp
            const newImageVersion = Date.now();
            setImageVersion(newImageVersion);

            // Update the user data in the query cache immediately
            if (data.user) {
                // Update both auth user and specific user queries
                queryClient.setQueryData(['authUser'], (oldData) => ({
                    ...oldData,
                    ...data.user
                }));
                
                queryClient.setQueryData(['user', user.username], (oldData) => ({
                    ...oldData,
                    ...data.user
                }));
                
                // Invalidate all related queries to ensure consistency
                queryClient.invalidateQueries({ queryKey: ['authUser'] });
                queryClient.invalidateQueries({ queryKey: ['user'] });
                queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            }

            // Update parent component with new profile image
            if (onUpdate && data.user?.profileImg) {
                onUpdate({ 
                    type: 'image', 
                    content: `${data.user.profileImg}?v=${newImageVersion}` 
                });
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
        if (baseUrl === "/avatar-placeholder.png") {
            return baseUrl;
        }
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
            <div className="relative w-32 h-32 rounded-full border-4 border-[#1e1e1e] overflow-hidden bg-[#1e1e1e]">
                <img
                    key={`profile-${user?._id}-${imageVersion}`}
                    src={getProfileImageUrl()}
                    alt="Profile"
                    className="w-full h-full object-cover object-center"
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
