import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaList, FaTh, FaLock, FaLockOpen, FaUsers, FaComments, FaNewspaper, FaUserFriends, FaUserPlus, FaPlus } from 'react-icons/fa';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';
import Post from '../components/common/Post';
import ThreadCard from '../components/ThreadCard';
import UserCard from '../components/common/UserCard';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ListsPage = () => {
    const [viewMode, setViewMode] = useState('list');
    const [contentType, setContentType] = useState('posts');
    const [privacyMode, setPrivacyMode] = useState('public');
    const [selectedList, setSelectedList] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDescription, setNewListDescription] = useState('');
    const [newListPrivacy, setNewListPrivacy] = useState('public');

    const queryClient = useQueryClient();

    // Fetch auth user data
    const { data: authUser } = useQuery({
        queryKey: ['authUser'],
        queryFn: async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                return res.data;
            } catch (error) {
                console.error('Error fetching auth user:', error);
                throw new Error(error.response?.data?.error || 'Failed to fetch user data');
            }
        }
    });

    // Fetch posts
    const { data: posts, isLoading: isLoadingPosts } = useQuery({
        queryKey: ['posts', 'lists', privacyMode],
        queryFn: async () => {
            try {
                const res = await axios.get(`${API_URL}/api/posts/lists`, {
                    params: { privacy: privacyMode },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                return res.data;
            } catch (error) {
                console.error('Error fetching posts:', error);
                throw new Error(error.response?.data?.error || 'Failed to fetch posts');
            }
        },
        enabled: contentType === 'posts'
    });

    // Fetch threads
    const { data: threads, isLoading: isLoadingThreads } = useQuery({
        queryKey: ['threads', 'lists', privacyMode],
        queryFn: async () => {
            try {
                const res = await axios.get(`${API_URL}/api/threads/lists`, {
                    params: { privacy: privacyMode },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                return res.data;
            } catch (error) {
                console.error('Error fetching threads:', error);
                throw new Error(error.response?.data?.error || 'Failed to fetch threads');
            }
        },
        enabled: contentType === 'threads'
    });

    // Fetch users based on selected list
    const { data: users, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['users', 'lists', selectedList, privacyMode],
        queryFn: async () => {
            try {
                let endpoint = `${API_URL}/api/users/lists`;
                if (selectedList === 'followers') {
                    endpoint = `${API_URL}/api/users/${authUser?.username}/followers`;
                } else if (selectedList === 'following') {
                    endpoint = `${API_URL}/api/users/${authUser?.username}/following`;
                }
                const res = await axios.get(endpoint, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                return res.data;
            } catch (error) {
                console.error('Error fetching users:', error);
                throw new Error(error.response?.data?.error || 'Failed to fetch users');
            }
        },
        enabled: contentType === 'users' && !!authUser
    });

    // Create new list mutation
    const { mutate: createList, isLoading: isCreatingList } = useMutation({
        mutationFn: async (listData) => {
            try {
                const res = await axios.post(`${API_URL}/api/lists`, listData, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                return res.data;
            } catch (error) {
                console.error('Error creating list:', error);
                throw new Error(error.response?.data?.error || 'Failed to create list');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['lists']);
            setShowCreateModal(false);
            setNewListName('');
            setNewListDescription('');
            setNewListPrivacy('public');
            toast.success('List created successfully');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleCreateList = (e) => {
        e.preventDefault();
        if (!newListName.trim()) {
            toast.error('List name is required');
            return;
        }
        createList({
            name: newListName.trim(),
            description: newListDescription.trim(),
            privacy: newListPrivacy
        });
    };

    const isLoading = isLoadingPosts || isLoadingThreads || isLoadingUsers;

    return (
        <div className="flex-[4_4_0] border-l border-r border-gray-700 min-h-screen">
            <PageHeader>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">Lists</h1>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                            disabled={isCreatingList}
                        >
                            <FaPlus className="w-4 h-4" />
                            {isCreatingList ? 'Creating...' : 'Create New List'}
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setContentType('posts')}
                                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                                    contentType === 'posts' ? 'text-blue-500' : 'text-gray-500'
                                }`}
                                title="Posts"
                            >
                                <FaNewspaper className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setContentType('threads')}
                                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                                    contentType === 'threads' ? 'text-blue-500' : 'text-gray-500'
                                }`}
                                title="Threads"
                            >
                                <FaComments className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setContentType('users')}
                                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                                    contentType === 'users' ? 'text-blue-500' : 'text-gray-500'
                                }`}
                                title="Users"
                            >
                                <FaUsers className="w-4 h-4" />
                            </button>
                        </div>
                        {contentType === 'users' && (
                            <div className="flex gap-2 ml-4">
                                <button
                                    onClick={() => setSelectedList('all')}
                                    className={`px-3 py-1 rounded-full hover:bg-gray-700 transition-colors ${
                                        selectedList === 'all' ? 'bg-blue-500 text-white' : 'text-gray-500'
                                    }`}
                                >
                                    All Users
                                </button>
                                <button
                                    onClick={() => setSelectedList('followers')}
                                    className={`px-3 py-1 rounded-full hover:bg-gray-700 transition-colors ${
                                        selectedList === 'followers' ? 'bg-blue-500 text-white' : 'text-gray-500'
                                    }`}
                                >
                                    <FaUserFriends className="inline-block mr-1" />
                                    Followers
                                </button>
                                <button
                                    onClick={() => setSelectedList('following')}
                                    className={`px-3 py-1 rounded-full hover:bg-gray-700 transition-colors ${
                                        selectedList === 'following' ? 'bg-blue-500 text-white' : 'text-gray-500'
                                    }`}
                                >
                                    <FaUserPlus className="inline-block mr-1" />
                                    Following
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setPrivacyMode(privacyMode === 'public' ? 'private' : 'public')}
                            className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                                privacyMode === 'private' ? 'text-blue-500' : 'text-gray-500'
                            }`}
                            title={`${privacyMode === 'public' ? 'Switch to Private' : 'Switch to Public'}`}
                        >
                            {privacyMode === 'public' ? (
                                <FaLockOpen className="w-4 h-4" />
                            ) : (
                                <FaLock className="w-4 h-4" />
                            )}
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                                    viewMode === 'list' ? 'text-blue-500' : 'text-gray-500'
                                }`}
                                title="List View"
                            >
                                <FaList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                                    viewMode === 'grid' ? 'text-blue-500' : 'text-gray-500'
                                }`}
                                title="Grid View"
                            >
                                <FaTh className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </PageHeader>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className={`p-4 ${
                    viewMode === 'grid' 
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                        : 'flex flex-col gap-4'
                }`}>
                    {contentType === 'posts' && posts?.map((post) => (
                        <div key={post._id} className={viewMode === 'grid' ? 'bg-[#1e1e1e] rounded-lg overflow-hidden' : ''}>
                            <Post post={post} isCompact={viewMode === 'grid'} />
                        </div>
                    ))}

                    {contentType === 'threads' && threads?.map((thread) => (
                        <div key={thread._id} className={viewMode === 'grid' ? 'bg-[#1e1e1e] rounded-lg overflow-hidden' : ''}>
                            <ThreadCard thread={thread} isCompact={viewMode === 'grid'} />
                        </div>
                    ))}

                    {contentType === 'users' && users?.map((user) => (
                        <div key={user._id} className={viewMode === 'grid' ? 'bg-[#1e1e1e] rounded-lg overflow-hidden' : ''}>
                            <UserCard user={user} isCompact={viewMode === 'grid'} />
                        </div>
                    ))}

                    {(!posts?.length && contentType === 'posts') && (
                        <div className="text-center text-gray-500 py-4">No posts found</div>
                    )}
                    {(!threads?.length && contentType === 'threads') && (
                        <div className="text-center text-gray-500 py-4">No threads found</div>
                    )}
                    {(!users?.length && contentType === 'users') && (
                        <div className="text-center text-gray-500 py-4">No users found</div>
                    )}
                </div>
            )}

            {/* Create List Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#1e1e1e] rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Create New List</h2>
                        <form onSubmit={handleCreateList} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    List Name
                                </label>
                                <input
                                    type="text"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter list name"
                                    required
                                    disabled={isCreatingList}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Description (optional)
                                </label>
                                <textarea
                                    value={newListDescription}
                                    onChange={(e) => setNewListDescription(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter list description"
                                    rows={3}
                                    disabled={isCreatingList}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Privacy
                                </label>
                                <select
                                    value={newListPrivacy}
                                    onChange={(e) => setNewListPrivacy(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isCreatingList}
                                >
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                                    disabled={isCreatingList}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isCreatingList}
                                >
                                    {isCreatingList ? 'Creating...' : 'Create List'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListsPage; 