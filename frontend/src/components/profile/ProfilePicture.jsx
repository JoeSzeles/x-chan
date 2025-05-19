import { useState, useRef } from 'react';
import { MdEdit } from 'react-icons/md';
import { useQueryClient } from '@tanstack/react-query';

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [profileImg, setProfileImg] = useState(null);
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setProfileImg(reader.result);
                onUpdate({ type: 'image', content: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="relative -mt-16 ml-4">
            <div className="w-32 h-32 rounded-full border-4 border-[#1e1e1e] overflow-hidden bg-[#1e1e1e]">
                <img
                    src={profileImg || user?.profileImg || "/avatar-placeholder.png"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        console.error('Error loading profile image:', e);
                        e.target.src = "/avatar-placeholder.png";
                    }}
                />
            </div>
            
            {isMyProfile && (
                <div
                    className="absolute bottom-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer opacity-0 group-hover:opacity-100 transition duration-200"
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