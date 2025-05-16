import { useState, useRef, useEffect } from 'react';
import { MdEdit, MdImage, MdVideoLibrary, MdHistory, MdVolumeUp, MdVolumeOff } from 'react-icons/md';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

const InteractiveCoverPhoto = ({ user, isMyProfile, onUpdate }) => {
    const [coverType, setCoverType] = useState('video'); // Default to video
    const [coverContent, setCoverContent] = useState('dQw4w9WgXcQ'); // Default video ID
    const [showOptions, setShowOptions] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [error, setError] = useState(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);

    // Add localStorage key for cover photo
    const COVER_PHOTO_STORAGE_KEY = `cover_photo_${user?._id}`;

    // Helper function to safely parse JSON
    const safeJSONParse = (data) => {
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return null;
        }
    };

    // Load cover photo from localStorage on mount
    useEffect(() => {
        if (!user?._id) return;

        try {
            const savedCoverPhoto = localStorage.getItem(COVER_PHOTO_STORAGE_KEY);
            if (!savedCoverPhoto) {
                // If no saved cover photo, set default video
                const defaultData = {
                    type: 'video',
                    content: 'dQw4w9WgXcQ',
                    metadata: {
                        videoId: 'dQw4w9WgXcQ',
                        source: 'youtube'
                    },
                    timestamp: Date.now()
                };
                localStorage.setItem(COVER_PHOTO_STORAGE_KEY, JSON.stringify(defaultData));
                setCoverType('video');
                setCoverContent('dQw4w9WgXcQ');
                onUpdate(defaultData);
                return;
            }

            const parsedData = safeJSONParse(savedCoverPhoto);
            if (!parsedData || typeof parsedData !== 'object') {
                console.error('Invalid cover photo data in localStorage');
                localStorage.removeItem(COVER_PHOTO_STORAGE_KEY);
                return;
            }

            const { type, content } = parsedData;
            if (type === 'video' && content && typeof content === 'string') {
                setCoverType('video');
                setCoverContent(content);
            }
        } catch (error) {
            console.error('Error loading cover photo from localStorage:', error);
            localStorage.removeItem(COVER_PHOTO_STORAGE_KEY);
        }
    }, [user?._id]);

    // Save cover photo to localStorage when it changes
    useEffect(() => {
        if (!user?._id || !coverType || !coverContent) return;

        try {
            const dataToSave = {
                type: coverType,
                content: coverContent,
                metadata: coverType === 'video' ? {
                    videoId: coverContent,
                    source: 'youtube'
                } : undefined,
                timestamp: Date.now()
            };

            localStorage.setItem(COVER_PHOTO_STORAGE_KEY, JSON.stringify(dataToSave));
            
            // Also update the backend
            if (onUpdate) {
                onUpdate(dataToSave);
            }
        } catch (error) {
            console.error('Error saving cover photo to localStorage:', error);
        }
    }, [coverType, coverContent, user?._id]);

    // Add debug logging for props
    useEffect(() => {
        console.log('InteractiveCoverPhoto props:', {
            userId: user?._id,
            isMyProfile,
            userCoverPhoto: user?.coverPhoto,
            userCoverImg: user?.coverImg
        });
    }, [user, isMyProfile]);

    // Fetch cover photo data
    const { data: coverPhotoData, isLoading: isLoadingCoverPhoto } = useQuery({
        queryKey: ['coverPhoto', user?._id],
        queryFn: async () => {
            console.log('Fetching cover photo for user:', user?._id);
            const res = await fetch(`/api/cover-photo/${user?._id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!res.ok) {
                if (res.status === 404) {
                    console.log('No cover photo found in database');
                    return null;
                }
                throw new Error('Failed to fetch cover photo');
            }
            const data = await res.json();
            console.log('Fetched cover photo data from API:', data);
            return data;
        },
        enabled: !!user?._id
    });

    // Initialize cover photo data when component mounts or when user changes
    useEffect(() => {
        console.log('Cover photo data changed:', {
            coverPhotoData,
            userCoverPhoto: user?.coverPhoto,
            userCoverImg: user?.coverImg
        });

        if (coverPhotoData?.type === 'video' && coverPhotoData?.content) {
            console.log('Setting cover from coverPhotoData:', coverPhotoData);
            setCoverType('video');
            setCoverContent(coverPhotoData.content);
        } else if (user?.coverPhoto?.type === 'video' && user?.coverPhoto?.content) {
            console.log('Setting cover from user.coverPhoto:', user.coverPhoto);
            setCoverType('video');
            setCoverContent(user.coverPhoto.content);
        } else if (user?.coverImg) {
            console.log('Setting cover from user.coverImg:', user.coverImg);
            setCoverType('image');
            setCoverContent(user.coverImg);
        } else {
            console.log('Setting default cover');
            setCoverType('video');
            setCoverContent('dQw4w9WgXcQ');
        }
    }, [coverPhotoData, user?.coverPhoto, user?.coverImg]);

    // Fetch user's recent posts for content option
    const { data: recentPosts } = useQuery({
        queryKey: ['userRecentPosts', user?._id],
        queryFn: async () => {
            const res = await fetch(`/api/posts/user/${user?._id}/recent`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        enabled: showOptions && coverType === 'content'
    });

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Create form data
            const formData = new FormData();
            formData.append('coverImg', file);

            // Upload image to server
            const response = await fetch('/api/users/upload/cover', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload cover image');
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Failed to update cover photo');
            }

            // Update local state
            setCoverContent(data.coverImg);
                setCoverType('image');
            
            // Update parent component
            onUpdate({ 
                type: 'image', 
                content: data.coverImg,
                metadata: {
                    source: 'upload'
                }
            });

            // Save to localStorage
            const dataToSave = {
                type: 'image',
                content: data.coverImg,
                metadata: {
                    source: 'upload'
                },
                timestamp: Date.now()
            };
            localStorage.setItem(COVER_PHOTO_STORAGE_KEY, JSON.stringify(dataToSave));

            // Close the options modal
            setShowOptions(false);

        } catch (error) {
            console.error('Error uploading cover image:', error);
            setError(error.message || 'Failed to upload cover image');
        }
    };

    const handleYoutubeSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!youtubeUrl) {
            setError('Please enter a YouTube URL');
            return;
        }

        try {
            const videoId = extractYoutubeId(youtubeUrl);
            if (!videoId) {
                setError('Invalid YouTube URL');
                return;
            }

            console.log('Extracted video ID:', videoId);

            // Verify the video exists
            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (!response.ok) {
                throw new Error('Video not found');
            }

            const updateData = { 
                type: 'video', 
                content: videoId,
                metadata: {
                    videoId,
                    source: 'youtube'
                }
            };

            console.log('Updating cover with data:', updateData);
            setCoverContent(videoId);
            setCoverType('video');
            onUpdate(updateData);
            setShowOptions(false);

            // Save to localStorage with validation
            try {
                const dataToSave = {
                    type: 'video',
                    content: videoId,
                    timestamp: Date.now()
                };
                localStorage.setItem(COVER_PHOTO_STORAGE_KEY, JSON.stringify(dataToSave));
            } catch (storageError) {
                console.error('Error saving to localStorage:', storageError);
                // Continue even if localStorage fails
            }
        } catch (error) {
            console.error('Error validating YouTube video:', error);
            setError('Invalid or unavailable YouTube video');
        }
    };

    const extractYoutubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleVideoHover = () => {
        if (!videoRef.current || isPlaying) return;

        try {
            // Play video
            videoRef.current.contentWindow.postMessage(
                JSON.stringify({
                    event: 'command',
                    func: 'playVideo',
                    args: []
                }),
                '*'
            );

            // Unmute when playing
            videoRef.current.contentWindow.postMessage(
                JSON.stringify({
                    event: 'command',
                    func: 'unMute',
                    args: []
                }),
                '*'
            );
            setIsMuted(false);
            setIsPlaying(true);
        } catch (error) {
            console.error('Error playing video on hover:', error);
        }
    };

    const handleVideoLeave = () => {
        if (!videoRef.current) return;

        try {
            // Pause video
            videoRef.current.contentWindow.postMessage(
                JSON.stringify({
                    event: 'command',
                    func: 'pauseVideo',
                    args: []
                }),
                '*'
            );
            setIsPlaying(false);
        } catch (error) {
            console.error('Error pausing video on leave:', error);
        }
    };

    const handleVideoClick = () => {
        if (!videoRef.current) return;

        try {
            // Toggle play/pause
            const command = isPlaying ? 'pauseVideo' : 'playVideo';
            videoRef.current.contentWindow.postMessage(
                JSON.stringify({
                    event: 'command',
                    func: command,
                    args: []
                }),
                '*'
            );

            // Unmute when playing
            if (!isPlaying) {
                videoRef.current.contentWindow.postMessage(
                    JSON.stringify({
                        event: 'command',
                        func: 'unMute',
                        args: []
                    }),
                    '*'
                );
                setIsMuted(false);
            }

            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error('Error controlling video:', error);
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation(); // Prevent triggering video click
        setIsMuted(!isMuted);
        if (videoRef.current) {
            try {
                videoRef.current.contentWindow.postMessage(
                    JSON.stringify({
                        event: 'command',
                        func: isMuted ? 'unMute' : 'mute',
                        args: []
                    }),
                    '*'
                );
            } catch (error) {
                console.error('Error toggling mute:', error);
            }
        }
    };

    const handleCoverUpdate = async (data) => {
        try {
            console.log('InteractiveCoverPhoto: handleCoverUpdate called with data:', data);
            
            const response = await fetch(`/api/users/${user?._id}/cover-photo`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: data.type,
                    content: data.content,
                    metadata: data.metadata
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update cover photo' }));
                throw new Error(errorData.message || 'Failed to update cover photo');
            }

            const responseData = await response.json();
            
            if (responseData.success) {
                // Update local state with new cover photo data
            setCoverContent(data.content);
            setCoverType(data.type);
                toast.success('Cover photo updated successfully');
            } else {
                throw new Error(responseData.message || 'Failed to update cover photo');
            }
        } catch (error) {
            console.error('InteractiveCoverPhoto: Error updating cover photo:', error);
            toast.error(error.message || 'Failed to update cover photo');
        }
    };

    const renderCoverContent = () => {
        if (isLoadingCoverPhoto) {
            return (
                <div className="h-52 w-full bg-gray-800 animate-pulse flex items-center justify-center">
                    <span className="text-gray-400">Loading...</span>
                </div>
            );
        }

        switch (coverType) {
            case 'video':
                return (
                    <div 
                        className="relative w-full h-52 group cursor-pointer" 
                        onClick={handleVideoClick}
                        onMouseEnter={handleVideoHover}
                        onMouseLeave={handleVideoLeave}
                    >
                        <iframe
                            ref={videoRef}
                            src={`https://www.youtube.com/embed/${coverContent}?autoplay=0&mute=1&controls=0&loop=1&playlist=${coverContent}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&origin=${window.location.origin}`}
                            className="absolute inset-0 w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                            title="Cover video"
                            onLoad={(e) => {
                                try {
                                    const iframe = e.target;
                                    if (iframe.contentWindow) {
                                        // Initialize the player
                                        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                                    }
                                } catch (error) {
                                    console.error('Error initializing video:', error);
                                }
                            }}
                        />
                        {/* Play/Pause Overlay */}
                        <div className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            </div>
                        </div>
                        {/* Centered Volume Control */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                                onClick={toggleMute}
                                className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors duration-200 transform hover:scale-110"
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? (
                                    <MdVolumeOff className="w-8 h-8" />
                                ) : (
                                    <MdVolumeUp className="w-8 h-8" />
                                )}
                            </button>
                        </div>
                    </div>
                );
            case 'content':
                return (
                    <div className="w-full h-52 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-center">
                            <h3 className="text-xl font-bold mb-2">Latest Content</h3>
                            <p className="text-sm">Select from your recent posts</p>
                        </div>
                    </div>
                );
            default:
                return (
                    <img
                        src={coverContent || user?.coverImg || "/cover.png"}
                        className="h-52 w-full object-cover"
                        alt="cover"
                        onError={(e) => {
                            console.error('Error loading cover image:', e);
                            e.target.src = "/cover.png";
                        }}
                    />
                );
        }
    };

    const renderOptionsModal = () => {
        if (!showOptions) return null;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-[#1e1e1e] rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-xl font-bold mb-4">Choose Cover Type</h3>
                    
                    <div className="space-y-4">
                        {/* Option 1: Image Upload */}
                        <div className="space-y-2">
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="w-full flex items-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700"
                        >
                            <MdImage className="w-6 h-6" />
                            <span>Upload Image</span>
                        </button>
                            {coverType === 'image' && coverContent && (
                                <div className="relative w-full h-32 rounded-lg overflow-hidden">
                                    <img
                                        src={coverContent}
                                        alt="Selected cover"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Option 2: Recent Content */}
                        <button
                            onClick={() => setCoverType('content')}
                            className="w-full flex items-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700"
                        >
                            <MdHistory className="w-6 h-6" />
                            <span>Use Recent Content</span>
                        </button>

                        {/* Option 3: YouTube Link */}
                        <form onSubmit={handleYoutubeSubmit} className="space-y-2">
                            <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                                <MdVideoLibrary className="w-6 h-6" />
                                <input
                                    type="text"
                                    placeholder="Enter YouTube URL"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    className="flex-1 bg-transparent border-none focus:outline-none"
                                />
                            </div>
                            {error && (
                                <p className="text-red-500 text-sm">{error}</p>
                            )}
                            <button
                                type="submit"
                                className="w-full p-2 bg-blue-500 rounded-lg hover:bg-blue-600"
                            >
                                Use Video
                            </button>
                        </form>
                    </div>

                    <div className="mt-6 flex gap-2">
                    <button
                        onClick={() => {
                            setShowOptions(false);
                            setError(null);
                            setYoutubeUrl('');
                        }}
                            className="flex-1 p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                        <button
                            onClick={() => {
                                if (coverType === 'image' && coverContent) {
                                    onUpdate({ type: 'image', content: coverContent });
                                    setShowOptions(false);
                                } else if (coverType === 'video' && coverContent) {
                                    onUpdate({ 
                                        type: 'video', 
                                        content: coverContent,
                                        metadata: {
                                            videoId: coverContent,
                                            source: 'youtube'
                                        }
                                    });
                                    setShowOptions(false);
                                }
                            }}
                            className="flex-1 p-2 bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!coverContent}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="relative group/cover">
            <div className="rounded-lg overflow-hidden border-2 border-gray-300">
                {renderCoverContent()}
            </div>

            {isMyProfile && (
                <div
                    className="absolute top-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer opacity-0 group-hover/cover:opacity-100 transition duration-200"
                    onClick={() => setShowOptions(true)}
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

            {renderOptionsModal()}
        </div>
    );
};

export default InteractiveCoverPhoto; 