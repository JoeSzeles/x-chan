import { useState, useRef, useEffect } from 'react';
import { MdEdit } from "react-icons/md";
import ImageScaleEditor from '../common/ImageScaleEditor';

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [profileImg, setProfileImg] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);
    const [showEditor, setShowEditor] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (e) => {
        console.log("File input change detected");
        const file = e.target.files[0];
        if (file) {
            console.log("File selected:", file.name);
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log("File loaded successfully");
                setSelectedImage(e.target.result);
                setShowEditor(true);
                console.log("Show editor state set to true");
            };
            reader.onerror = (error) => {
                console.error("Error reading file:", error);
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        console.log("Editor visibility state:", showEditor);
        console.log("Selected image state:", !!selectedImage);
    }, [showEditor, selectedImage]);

    const handleEditorSave = async ({ scale, position }) => {
        if (!selectedFile) return;

        // Create a canvas to apply the transformations
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        try {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = selectedImage;
            });

            // Set canvas size to final dimensions (circle size)
            const finalSize = 400;
            canvas.width = finalSize;
            canvas.height = finalSize;

            // Create circular clipping path
            ctx.beginPath();
            ctx.arc(finalSize/2, finalSize/2, finalSize/2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // Calculate dimensions while maintaining aspect ratio
            const scaleFactor = Math.max(
                finalSize / img.width,
                finalSize / img.height
            ) * scale;

            const scaledWidth = img.width * scaleFactor;
            const scaledHeight = img.height * scaleFactor;

            // Center the image
            const x = (finalSize - scaledWidth) / 2 + position.x * scale;
            const y = (finalSize - scaledHeight) / 2 + position.y * scale;

            // Draw the image with the corrected scaling and position
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

            // Convert canvas to blob
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            const transformedFile = new File([blob], 'profile.jpg', { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append('profileImg', transformedFile);

            const response = await fetch('/api/users/upload/profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format from server');
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile picture');
            }

            if (data.user?.profileImg) {
                setProfileImg(data.user.profileImg);
                if (onUpdate) {
                    onUpdate({ type: 'image', content: data.user.profileImg });
                }
            }
            setShowEditor(false);
            setSelectedImage(null);
            setSelectedFile(null);

        } catch (error) {
            console.error('Error updating profile picture:', error);
            toast.error(error.message || 'Failed to update profile picture');
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
            
            {showEditor && selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                    <ImageScaleEditor 
                        image={selectedImage}
                        onSave={handleEditorSave}
                        onClose={() => {
                            setShowEditor(false);
                            setSelectedImage(null);
                            setSelectedFile(null);
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default ProfilePicture;