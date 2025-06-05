
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

            console.log('Uploading file:', file.name, file.type, file.size);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch('/api/upload/profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            console.log('Response status:', response.status);
            console.log('Response content-type:', response.headers.get('content-type'));

            const contentType = response.headers.get('content-type');
            console.log('Full response headers:', [...response.headers.entries()]);
            
            if (!response.ok) {
                let errorMessage = `Upload failed: ${response.status}`;
                try {
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } else {
                        const errorText = await response.text();
                        console.error('Non-JSON error response:', errorText);
                        errorMessage = errorText || errorMessage;
                    }
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                    errorMessage = `Server error: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            let data;
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (parseError) {
                    console.error('Failed to parse JSON response:', parseError);
                    const responseText = await response.text();
                    console.error('Raw response text:', responseText);
                    throw new Error('Server returned invalid JSON format');
                }
            } else {
                const responseText = await response.text();
                console.error('Non-JSON response received:', responseText);
                console.error('Content-Type:', contentType);
                throw new Error('Server returned non-JSON response');
            }

            console.log('Upload response data:', data);

            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            // Force complete image refresh with new timestamp
            const newVersion = Date.now();
            setImageVersion(newVersion);

            // Update the parent component immediately
            if (onUpdate && data.user?.profileImg) {
                onUpdate({ type: 'image', content: data.user.profileImg });
            }

            // Force immediate refresh of user data in React Query cache
            if (window.location.pathname.includes('/profile/')) {
                // Invalidate all user-related queries to force refetch
                const queryClient = window.queryClient;
                if (queryClient) {
                    queryClient.invalidateQueries({ queryKey: ["authUser"] });
                    queryClient.invalidateQueries({ queryKey: ["user"] });
                }
                
                // Also dispatch custom event for immediate UI updates
                window.dispatchEvent(new CustomEvent('profileImageUpdated', { 
                    detail: { 
                        url: data.user?.profileImg, 
                        version: newVersion,
                        user: data.user
                    } 
                }));
            }

            // Force page refresh as last resort to ensure UI updates
            setTimeout(() => {
                if (window.location.pathname.includes('/profile/')) {
                    window.location.reload();
                }
            }, 1000);

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

                {/* Online status indicator - positioned at top-right of avatar */}
                {user?.isOnline && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
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
