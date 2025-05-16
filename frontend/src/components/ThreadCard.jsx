import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaComment, FaImage, FaShare, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const ThreadCard = ({ thread, onRepost }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showRepostOptions, setShowRepostOptions] = useState(false);
    const [selectedBoard, setSelectedBoard] = useState('');

    const handleRepost = async (repostType) => {
        try {
            await onRepost(thread.id, repostType, selectedBoard);
            setShowRepostOptions(false);
        } catch (error) {
            console.error('Error reposting:', error);
        }
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {thread.subject || 'No Subject'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            Posted by Anonymous • {formatDistanceToNow(new Date(thread.timestamp * 1000), { addSuffix: true })}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowRepostOptions(true)}
                        className="text-blue-500 hover:text-blue-700"
                    >
                        <FaShare />
                    </button>
                </div>

                <div className={`relative ${!isExpanded ? 'max-h-[400px] overflow-hidden' : ''}`}>
                    {thread.image && (
                        <div className="mb-3">
                            <img
                                src={thread.image}
                                alt="Thread image"
                                className="w-full h-auto rounded"
                            />
                        </div>
                    )}

                    <div className="prose max-w-none">
                        {thread.comment}
                    </div>

                    {!isExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
                    )}
                </div>

                {thread.comment && thread.comment.length > 500 && (
                    <button
                        onClick={toggleExpand}
                        className="mt-2 text-blue-500 hover:text-blue-700 flex items-center"
                    >
                        {isExpanded ? (
                            <>
                                <FaChevronUp className="mr-1" />
                                Show Less
                            </>
                        ) : (
                            <>
                                <FaChevronDown className="mr-1" />
                                Read More
                            </>
                        )}
                    </button>
                )}

                <div className="mt-3 flex items-center space-x-4 text-gray-500">
                    <div className="flex items-center">
                        <FaComment className="mr-1" />
                        <span>{thread.replies || 0}</span>
                    </div>
                    {thread.images > 0 && (
                        <div className="flex items-center">
                            <FaImage className="mr-1" />
                            <span>{thread.images}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Repost Options Modal */}
            {showRepostOptions && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Repost Options</h3>
                        
                        <div className="space-y-4">
                            <button
                                onClick={() => handleRepost('personal')}
                                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
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
                                >
                                    <option value="">Select a board</option>
                                    {boards.map((b) => (
                                        <option key={b._id} value={b.name}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleRepost('board')}
                                    className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                                    disabled={!selectedBoard}
                                >
                                    Repost to Selected Board
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowRepostOptions(false)}
                            className="mt-4 w-full bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThreadCard; 