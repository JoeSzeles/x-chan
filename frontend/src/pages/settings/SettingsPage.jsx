import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { FaUser, FaBell, FaLock, FaPalette, FaLanguage, FaEye, FaImage, FaVideo, FaLink, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Breadcrumb from '../../components/common/Breadcrumb';

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('account');
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: authUser, isLoading } = useQuery({
        queryKey: ['authUser'],
        queryFn: async () => {
            const res = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch user data');
            return data;
        }
    });

    const { mutate: updateSettings } = useMutation({
        mutationFn: async (settings) => {
            console.log('Updating settings with:', settings);
            const res = await fetch('/api/users/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Cache-Control': 'no-cache'
                },
                credentials: 'include',
                body: JSON.stringify({ settings })
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
                throw new Error(errorData.error || 'Failed to update settings');
            }
            
            const data = await res.json();
            return data;
        },
        onSuccess: (data) => {
            console.log('Settings updated successfully:', data);
            toast.success('Settings updated successfully');
            queryClient.setQueryData(['authUser'], data);
        },
        onError: (error) => {
            console.error('Error updating settings:', error);
            toast.error(error.message || 'Failed to update settings');
        }
    });

    const handleCoverPhotoUpdate = async (type, content) => {
        try {
            const response = await fetch('/api/cover-photo/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    type,
                    content,
                    metadata: type === 'video' ? {
                        videoId: content,
                        source: 'youtube'
                    } : undefined
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update cover photo');
            }

            const { coverPhoto, user } = await response.json();
            queryClient.setQueryData(['authUser'], user);
            toast.success('Cover photo updated successfully');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                handleCoverPhotoUpdate('image', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleYoutubeSubmit = async (e) => {
        e.preventDefault();
        const url = e.target.youtubeUrl.value;
        const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
        
        if (!videoId) {
            toast.error('Invalid YouTube URL');
            return;
        }

        handleCoverPhotoUpdate('video', videoId);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (videoRef.current) {
            try {
                const message = {
                    event: 'command',
                    func: isMuted ? 'unMute' : 'mute',
                    args: []
                };
                videoRef.current.contentWindow.postMessage(JSON.stringify(message), '*');
            } catch (error) {
                console.error('Error toggling mute:', error);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const tabs = [
        { id: 'account', label: 'Account', icon: <FaUser /> },
        { id: 'notifications', label: 'Notifications', icon: <FaBell /> },
        { id: 'privacy', label: 'Privacy', icon: <FaLock /> },
        { id: 'appearance', label: 'Appearance', icon: <FaPalette /> },
        { id: 'language', label: 'Language', icon: <FaLanguage /> },
        { id: 'accessibility', label: 'Accessibility', icon: <FaEye /> }
    ];

    const renderSettingsContent = () => {
        switch (activeTab) {
            case 'account':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Account Settings</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Email</label>
                                <input
                                    type="email"
                                    value={authUser?.email}
                                    className="w-full p-2 rounded-lg bg-[#272525]/50 border border-white/10"
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Username</label>
                                <input
                                    type="text"
                                    value={authUser?.username}
                                    className="w-full p-2 rounded-lg bg-[#272525]/50 border border-white/10"
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Notification Settings</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Email Notifications</h3>
                                    <p className="text-sm text-gray-500">Receive email notifications for important updates</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Push Notifications</h3>
                                    <p className="text-sm text-gray-500">Receive push notifications for new interactions</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            
                            <h3 className="font-medium mt-4">Notification Types</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium">Post Ratings</h4>
                                        <p className="text-xs text-gray-500">When someone rates your posts</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium">Achievements</h4>
                                        <p className="text-xs text-gray-500">When you earn new achievements</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium">Content Recommendations</h4>
                                        <p className="text-xs text-gray-500">Personalized content suggestions</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium">Mention Reactions</h4>
                                        <p className="text-xs text-gray-500">When someone reacts to mentions of you</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium">Scheduled Reminders</h4>
                                        <p className="text-xs text-gray-500">Custom reminders you've created</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium">Bookmark Activity</h4>
                                        <p className="text-xs text-gray-500">Updates to your bookmarked content</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium">Featured Posts</h4>
                                        <p className="text-xs text-gray-500">When your posts are featured</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Mentions</h3>
                                    <p className="text-sm text-gray-500">When someone mentions you with @username</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Comment Replies</h3>
                                    <p className="text-sm text-gray-500">When someone replies to your comment</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Milestones</h3>
                                    <p className="text-sm text-gray-500">When you reach a certain follower count or engagement level</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Trending Topics</h3>
                                    <p className="text-sm text-gray-500">When topics you follow start trending</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Board Activity</h3>
                                    <p className="text-sm text-gray-500">When there's new activity in boards you follow</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">System Announcements</h3>
                                    <p className="text-sm text-gray-500">Important platform updates and announcements</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Privacy Settings</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Private Profile</h3>
                                    <p className="text-sm text-gray-500">Only approved followers can see your posts</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Show Online Status</h3>
                                    <p className="text-sm text-gray-500">Let others see when you're active</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Appearance Settings</h2>
                        <div className="space-y-8">
                            {/* Theme Settings */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-lg">Theme</h3>
                                <div>
                                    <select 
                                        className="w-full p-2 rounded-lg bg-[#272525]/50 border border-white/10"
                                        value={authUser?.settings?.appearance?.theme || 'dark'}
                                        onChange={(e) => {
                                            const newSettings = {
                                                ...authUser?.settings,
                                                appearance: {
                                                    ...authUser?.settings?.appearance,
                                                    theme: e.target.value
                                                }
                                            };
                                            console.log('Updating theme settings:', newSettings);
                                            updateSettings(newSettings);
                                        }}
                                    >
                                        <option value="dark">Dark</option>
                                        <option value="light">Light</option>
                                        <option value="system">System</option>
                                    </select>
                                </div>
                            </div>

                            {/* Font Size Settings */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-lg">Font Size</h3>
                                <div>
                                    <select 
                                        className="w-full p-2 rounded-lg bg-[#272525]/50 border border-white/10"
                                        value={authUser?.settings?.appearance?.fontSize || 'medium'}
                                        onChange={(e) => {
                                            const newSettings = {
                                                ...authUser?.settings,
                                                appearance: {
                                                    ...authUser?.settings?.appearance,
                                                    fontSize: e.target.value
                                                }
                                            };
                                            console.log('Updating font size settings:', newSettings);
                                            updateSettings(newSettings);
                                        }}
                                    >
                                        <option value="small">Small</option>
                                        <option value="medium">Medium</option>
                                        <option value="large">Large</option>
                                    </select>
                                </div>
                            </div>

                            {/* Wide Mode Settings */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-lg">View Mode</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Wide Mode</h4>
                                        <p className="text-sm text-gray-500">Use wide view for posts and threads</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={authUser?.settings?.appearance?.wideMode || false}
                                            onChange={(e) => {
                                                const newSettings = {
                                                    ...authUser?.settings,
                                                    appearance: {
                                                        ...authUser?.settings?.appearance,
                                                        wideMode: e.target.checked
                                                    }
                                                };
                                                console.log('Updating wide mode settings:', newSettings);
                                                updateSettings(newSettings);
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Cover Photo Settings */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-lg">Cover Photo</h3>
                                <div className="space-y-4">
                                    {/* Current Cover Photo Preview */}
                                    {authUser?.coverPhoto && (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden group">
                                            {authUser.coverPhoto.type === 'video' ? (
                                                <>
                                                    <iframe
                                                        ref={videoRef}
                                                        src={`https://www.youtube.com/embed/${authUser.coverPhoto.content}?autoplay=1&mute=0&controls=0&loop=1&playlist=${authUser.coverPhoto.content}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&origin=${window.location.origin}`}
                                                        className="w-full h-full"
                                                        frameBorder="0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                        loading="lazy"
                                                        title="Cover video"
                                                        onLoad={(e) => {
                                                            try {
                                                                const iframe = e.target;
                                                                if (iframe.contentWindow) {
                                                                    const message = {
                                                                        event: 'command',
                                                                        func: 'setVolume',
                                                                        args: [50]
                                                                    };
                                                                    iframe.contentWindow.postMessage(JSON.stringify(message), '*');
                                                                }
                                                            } catch (error) {
                                                                console.error('Error setting initial volume:', error);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={toggleMute}
                                                        className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70 z-10"
                                                    >
                                                        {isMuted ? <FaVolumeMute className="w-4 h-4" /> : <FaVolumeUp className="w-4 h-4" />}
                                                    </button>
                                                </>
                                            ) : (
                                                <img
                                                    src={authUser.coverPhoto.content}
                                                    alt="Cover"
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* Upload Image Option */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <FaImage className="w-5 h-5" />
                                            <span>Upload Image</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageUpload}
                                            />
                                        </label>
                                    </div>

                                    {/* YouTube Video Option */}
                                    <div className="space-y-2">
                                        <form onSubmit={handleYoutubeSubmit} className="space-y-2">
                                            <label className="flex items-center gap-2">
                                                <FaVideo className="w-5 h-5" />
                                                <span>YouTube Video</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    name="youtubeUrl"
                                                    placeholder="Enter YouTube URL"
                                                    className="flex-1 p-2 rounded-lg bg-[#272525]/50 border border-white/10"
                                                />
                                                <button
                                                    type="submit"
                                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                                                >
                                                    Use Video
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Remove Cover Photo Option */}
                                    {authUser?.coverPhoto && (
                                        <button
                                            onClick={() => handleCoverPhotoUpdate('image', '')}
                                            className="text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            Remove Cover Photo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'language':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Language Settings</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-medium mb-2">Display Language</h3>
                                <select className="w-full p-2 rounded-lg bg-[#272525]/50 border border-white/10">
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'accessibility':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Accessibility Settings</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">High Contrast Mode</h3>
                                    <p className="text-sm text-gray-500">Increase contrast for better visibility</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Reduce Motion</h3>
                                    <p className="text-sm text-gray-500">Minimize animations and transitions</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex-[4_4_0] border-l border-r border-gray-700 min-h-screen">
            {/* Breadcrumb Navigation */}
            <Breadcrumb 
                items={[
                    { label: 'Settings' }
                ]}
            />

            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 border-r border-gray-700 p-4">
                    <h2 className="text-xl font-bold mb-4">Settings</h2>
                    <nav className="space-y-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-white'
                                        : 'hover:bg-gray-800'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
                    {renderSettingsContent()}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage; 