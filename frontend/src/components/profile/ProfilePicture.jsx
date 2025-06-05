
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

            // Only try to parse JSON if the content type is JSON
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                console.warn('Non-JSON response received');
                data = { success: true };
            }

            // Update profile picture in the database
            if (data.url) {
                // Now call the user profile update endpoint to save the URL
                const updateResponse = await fetch('/api/users/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ profileImg: data.url })
                });
                
                if (!updateResponse.ok) {
                    throw new Error('Failed to update user profile with new image');
                }
                
                const updateData = await updateResponse.json();
                
                // Force refresh of the image by updating timestamp
                setImageVersion(Date.now());
                
                if (onUpdate && updateData.user?.profileImg) {
                    onUpdate({ type: 'image', content: updateData.user.profileImg });
                }
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
                    className={`absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 cursor-pointer transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => fileInputRef.current.click()}
                >
                    <MdEdit className="w-8 h-8 text-white" />
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
