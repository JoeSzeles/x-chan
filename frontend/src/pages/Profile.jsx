import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import InteractiveCoverPhoto from '../components/common/InteractiveCoverPhoto';
// ... other imports ...

const Profile = () => {
    const { username } = useParams();
    const [user, setUser] = useState(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [coverVideoUrl, setCoverVideoUrl] = useState('');
    const [showVideoInput, setShowVideoInput] = useState(false);
    const [videoInputValue, setVideoInputValue] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch(`/api/users/${username}`);
                const data = await response.json();
                setUser(data);
                setCoverVideoUrl(data.coverVideoUrl || '');
                // Check if this is the user's own profile
                const currentUserResponse = await fetch('/api/users/me');
                const currentUser = await currentUserResponse.json();
                setIsOwnProfile(currentUser.username === username);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchUserData();
    }, [username]);

    const handleCoverVideoUpdate = async () => {
        try {
            const response = await fetch('/api/users/cover-video', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoUrl: videoInputValue }),
            });

            if (!response.ok) {
                throw new Error('Failed to update cover video');
            }

            const updatedUser = await response.json();
            setCoverVideoUrl(updatedUser.coverVideoUrl);
            setUser(updatedUser);
            setShowVideoInput(false);
            setVideoInputValue('');
        } catch (error) {
            console.error('Error updating cover video:', error);
            alert('Failed to update cover video. Please check the URL and try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Cover Photo/Video Section */}
            <div className="relative w-full h-[300px]">
                {coverVideoUrl ? (
                    <InteractiveCoverPhoto videoUrl={coverVideoUrl} />
                ) : (
                    <div 
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${user?.coverImg || '/default-cover.jpg'})` }}
                    />
                )}
                
                {/* Cover Photo/Video Upload Button */}
                {isOwnProfile && (
                    <div className="absolute bottom-4 right-4">
                        {showVideoInput ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={videoInputValue}
                                    onChange={(e) => setVideoInputValue(e.target.value)}
                                    placeholder="Enter YouTube URL"
                                    className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleCoverVideoUpdate}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setShowVideoInput(false);
                                        setVideoInputValue('');
                                    }}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowVideoInput(true)}
                                className="bg-white/80 hover:bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg transition-colors"
                            >
                                Change Cover
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Rest of the profile content */}
            {/* ... existing profile content ... */}
        </div>
    );
};

export default Profile; 