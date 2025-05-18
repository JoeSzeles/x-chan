import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useBoards } from '../contexts/BoardsContext';
import { FaArrowLeft, FaShare, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ThreadView = () => {
    const { board, threadId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { boards } = useBoards();
    const [thread, setThread] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showRepostOptions, setShowRepostOptions] = useState(false);
    const [selectedBoard, setSelectedBoard] = useState('');
    const [reposting, setReposting] = useState(false);

    // ... existing useEffect and other functions ...

    const handleConvertToPost = async (repostType) => {
        try {
            setReposting(true);
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/leech/4chan/${board}/convert/${threadId}`,
                {
                    repostType,
                    targetBoard: repostType === 'board' ? selectedBoard : undefined
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.data.success) {
                toast.success('Thread converted successfully!');
                if (repostType === 'personal') {
                    navigate('/profile');
                } else {
                    navigate(`/board/${selectedBoard}`);
                }
            }
        } catch (error) {
            console.error('Error converting thread:', error);
            toast.error(error.response?.data?.error || 'Failed to convert thread');
        } finally {
            setReposting(false);
            setShowRepostOptions(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex items-center mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <FaArrowLeft className="mr-2" />
                        Back
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <FaSpinner className="animate-spin text-4xl text-blue-500" />
                    </div>
                ) : error ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                ) : thread ? (
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold">
                                        {thread.subject || 'No Subject'}
                                    </h2>
                                    <p className="text-gray-500 text-sm">
                                        Posted by Anonymous on {new Date(thread.timestamp * 1000).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowRepostOptions(true)}
                                    className="flex items-center text-blue-500 hover:text-blue-700"
                                    disabled={reposting}
                                >
                                    <FaShare className="mr-2" />
                                    {reposting ? 'Reposting...' : 'Repost'}
                                </button>
                            </div>

                            {thread.image && (
                                <div className="mb-4">
                                    <img
                                        src={`https://i.4cdn.org/${board}/${thread.tim}${thread.ext}`}
                                        alt="Thread image"
                                        className="max-w-full h-auto rounded"
                                    />
                                </div>
                            )}

                            <div className="prose max-w-none">
                                {thread.comment}
                            </div>
                        </div>

                        {/* Replies */}
                        {thread.replies?.map((reply, index) => (
                            <div key={index} className="bg-white rounded-lg shadow p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-gray-500 text-sm">
                                            Anonymous • {new Date(reply.timestamp * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {reply.image && (
                                    <div className="my-2">
                                        <img
                                            src={`https://i.4cdn.org/${board}/${reply.tim}${reply.ext}`}
                                            alt="Reply image"
                                            className="max-w-full h-auto rounded"
                                        />
                                    </div>
                                )}

                                <div className="prose max-w-none">
                                    {reply.comment}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {/* Repost Options Modal */}
                {showRepostOptions && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold mb-4">Repost Options</h3>
                            
                            <div className="space-y-4">
                                <button
                                    onClick={() => handleConvertToPost('personal')}
                                    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                                    disabled={reposting}
                                >
                                    Repost to My Profile
                                </button>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Repost to Board
                                    </label>
                                    <select
                                        value={selectedBoard}
                                        onChange={(e) => setSelectedBoard(e.target.value)}
                                        className="w-full border rounded p-2"
                                        disabled={reposting}
                                    >
                                        <option value="">Select a board</option>
                                        {boards.map((b) => (
                                            <option key={b._id} value={b.name}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleConvertToPost('board')}
                                        className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                                        disabled={reposting || !selectedBoard}
                                    >
                                        Repost to Selected Board
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowRepostOptions(false)}
                                className="mt-4 w-full bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
                                disabled={reposting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ThreadView; 