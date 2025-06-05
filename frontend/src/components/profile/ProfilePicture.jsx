import { useState, useRef } from 'react';
import { MdEdit } from "react-icons/md";
import { toast } from 'react-hot-toast';

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);
    const [imageVersion, setImageVersion] = useState(Date.now());

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);

            const formData = new FormData();
            formData.append('profileImg', file);

            const response = await fetch('/api/users/upload/profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            // Log the response to see what we're getting
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers.get('content-type'));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload failed with status:', response.status);
                console.error('Error response:', errorText);
                throw new Error(`Upload failed: ${response.status}`);
            }

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                const responseText = await response.text();
                console.error('Failed to parse JSON response:', responseText);
                throw new Error('Server returned invalid response format');
            }

            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            // Update image version to force refresh
            setImageVersion(Date.now());

            // Call the update callback if provided
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
            <div className="w-32 h-32 rounded-full border-4 border-[#1e1e1e] overflow-hidden bg-[#1e1e1e] relative">
                <img
                    src={getProfileImageUrl()}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.src = "/avatar-placeholder.png";
                    }}
                />

                {/* Online status indicator - positioned on top of avatar */}
                {user?.isOnline && (
                    <div className="absolute top-1 right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full z-10"></div>
                )}
            </div>

            {isMyProfile && (
                <div
                    className={`absolute bottom-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => fileInputRef.current?.click()}
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