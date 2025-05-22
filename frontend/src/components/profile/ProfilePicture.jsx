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

        try {
            // Create a canvas to apply the transformations
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

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
            const baseScaleFactor = Math.max(
                finalSize / img.width,
                finalSize / img.height
            );

            // Apply user's custom scaling
            const scaleFactor = baseScaleFactor * scale;

            const scaledWidth = img.width * scaleFactor;
            const scaledHeight = img.height * scaleFactor;

            // Apply position directly without scaling it
            // This matches how the position is displayed in the editor
            const x = (finalSize - scaledWidth) / 2 + position.x;
            const y = (finalSize - scaledHeight) / 2 + position.y;

            // Draw the image with the corrected scaling and position
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

            // Convert canvas to blob with proper mime type (preserving original type if possible)
            const mimeType = selectedFile.type || 'image/jpeg';
            const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.9));
            const transformedFile = new File([blob], `profile.${mimeType.split('/')[1] || 'jpg'}`, { type: mimeType });

            const formData = new FormData();
            formData.append('profileImg', transformedFile);

            console.log('Uploading processed image:', {
                originalSize: selectedFile.size,
                processedSize: transformedFile.size,
                type: transformedFile.type
            });

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

            // Clean up on error too
            setShowEditor(false);
            setSelectedImage(null);
            setSelectedFile(null);
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
                        onCancel={() => {
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