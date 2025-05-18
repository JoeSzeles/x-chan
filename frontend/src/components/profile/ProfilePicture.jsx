
import { useState, useRef } from 'react';
import { MdEdit } from "react-icons/md";

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [profileImg, setProfileImg] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/users/upload/profile', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to update profile picture');
                }

                const data = await response.json();
                if (data.user?.profileImg) {
                    setProfileImg(data.user.profileImg);
                    if (onUpdate) {
                        onUpdate({ type: 'image', content: data.user.profileImg });
                    }
                }
            } catch (error) {
                console.error('Error updating profile picture:', error);
            }
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
                    style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center'
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
        </div>
    );
};

export default ProfilePicture;
