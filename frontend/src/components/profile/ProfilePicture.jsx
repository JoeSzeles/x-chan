
import { useState, useRef, useEffect } from 'react';
import { MdEdit } from "react-icons/md";
import ImageScaleEditor from '../common/ImageScaleEditor';
import { toast } from 'react-hot-toast';

const ProfilePicture = ({ user, isMyProfile, onUpdate }) => {
    const [profileImg, setProfileImg] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);
    const [showEditor, setShowEditor] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log("File selected:", file.name);
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setSelectedImage(e.target.result);
                setShowEditor(true);
            };
            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                toast.error("Failed to read image file");
            };
            reader.readAsDataURL(file);
        }
    };

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

            // Fixed dimensions for the final output
            const OUTPUT_SIZE = 400;
            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;

            // Create circular clipping path
            ctx.beginPath();
            ctx.arc(OUTPUT_SIZE/2, OUTPUT_SIZE/2, OUTPUT_SIZE/2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            // Fill with background color to ensure transparency is handled properly
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
            
            // Apply the exact same transformations as in the editor preview
            const centerX = OUTPUT_SIZE / 2;
            const centerY = OUTPUT_SIZE / 2;
            
            ctx.save();
            // First translate to the center of the canvas
            ctx.translate(centerX, centerY);
            // Apply the user's position offset
            ctx.translate(position.x, position.y);
            // Apply the user's scale
            ctx.scale(scale, scale);
            // Draw the image centered at the origin (0,0)
            ctx.drawImage(
                img, 
                -img.width / 2,
                -img.height / 2,
                img.width,
                img.height
            );
            ctx.restore();

            // Convert canvas to blob with proper mime type
            const mimeType = selectedFile.type || 'image/jpeg';
            const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.9));
            const transformedFile = new File([blob], `profile.${mimeType.split('/')[1] || 'jpg'}`, { type: mimeType });

            const formData = new FormData();
            formData.append('profileImg', transformedFile);

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
                // Add a cache-busting parameter to force reload
                const cacheBust = `?t=${Date.now()}`;
                setProfileImg(data.user.profileImg + cacheBust);
                
                if (onUpdate) {
                    onUpdate({ type: 'image', content: data.user.profileImg });
                }
            }
            
            // Clean up
            setShowEditor(false);
            setSelectedImage(null);
            setSelectedFile(null);
            
            toast.success('Profile picture updated successfully');

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
                    key={profileImg || user?.profileImg} // Force reload when image changes
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
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]">
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
