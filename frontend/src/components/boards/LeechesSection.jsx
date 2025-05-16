import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaSync, FaPlus, FaList, FaTh, FaThLarge, FaThList, FaThLarge as FaThLarge2, FaArrowLeft } from 'react-icons/fa';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LeechesSection = () => {
    const [selectedBoard, setSelectedBoard] = useState('biz');
    const [selectedCatalog, setSelectedCatalog] = useState('catalog');
    const [customBoard, setCustomBoard] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [gridColumns, setGridColumns] = useState(5); // 2, 3, 4, or 5
    const [showPreview, setShowPreview] = useState(false);
    const [selectedThread, setSelectedThread] = useState(null);
    const [targetBoard, setTargetBoard] = useState('');
    const [threadComments, setThreadComments] = useState([]);
    const navigate = useNavigate();

    // Fetch auth user data
    const { data: authUser } = useQuery({
        queryKey: ['authUser'],
        queryFn: async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return null;

                const response = await axios.get('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return response.data;
            } catch (error) {
                console.error('Error fetching auth user:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                return null;
            }
        }
    });

    // Fetch user's boards (owned and followed)
    const { data: boards, isLoading: isLoadingBoards } = useQuery({
        queryKey: ['userBoards'],
        queryFn: async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token || !authUser?._id) return [];

                const response = await axios.get(`/api/boards/user/${authUser._id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.data.success) {
                    throw new Error(response.data.error || 'Failed to fetch boards');
                }

                // Combine owned and followed boards, removing duplicates
                const ownedBoards = response.data.data.owned || [];
                const followedBoards = response.data.data.followed || [];
                
                // Create a map to track unique boards by ID
                const uniqueBoards = new Map();
                
                // Add owned boards first (they take precedence)
                ownedBoards.forEach(board => {
                    uniqueBoards.set(board._id, { ...board, isOwner: true });
                });
                
                // Add followed boards that aren't already in the map
                followedBoards.forEach(board => {
                    if (!uniqueBoards.has(board._id)) {
                        uniqueBoards.set(board._id, { ...board, isOwner: false });
                    }
                });

                return Array.from(uniqueBoards.values());
            } catch (error) {
                console.error('Error fetching user boards:', error);
                toast.error('Failed to load your boards');
                return [];
            }
        },
        enabled: !!authUser
    });

    // Fetch threads from 4chan
    const { data: threads, isLoading, error, refetch } = useQuery({
        queryKey: ['4chanThreads', selectedBoard, selectedCatalog],
        queryFn: async () => {
            try {
                const board = showCustomInput ? customBoard : selectedBoard;
                console.log(`[LeechesSection] Fetching threads for board: ${board}`);
                
                const res = await fetch(`/api/leech/4chan/${board}/${selectedCatalog}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });

                console.log(`[LeechesSection] Response status: ${res.status}`);
                const data = await res.json();
                console.log(`[LeechesSection] Response data:`, data);

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to fetch threads');
                }

                return data.data;
            } catch (error) {
                console.error('[LeechesSection] Error fetching threads:', error);
                toast.error(error.message || 'Failed to fetch threads');
                throw error;
            }
        },
        refetchInterval: 300000, // Refetch every 5 minutes
        enabled: !showCustomInput || (showCustomInput && customBoard.trim() !== ''),
        retry: 1, // Only retry once
        retryDelay: 1000, // Wait 1 second before retrying
    });

    // Fetch thread comments when a thread is selected
    const { data: threadContent } = useQuery({
        queryKey: ['threadContent', selectedBoard, selectedThread?.id],
        queryFn: async () => {
            if (!selectedThread?.id) return null;
            try {
                const response = await axios.get(`/api/leech/4chan/${selectedBoard}/thread/${selectedThread.id}`);
                if (!response.data.success) {
                    throw new Error(response.data.error || 'Failed to fetch thread content');
                }
                return response.data.data;
            } catch (error) {
                console.error('Error fetching thread content:', error);
                toast.error('Failed to load thread content');
                return null;
            }
        },
        enabled: !!selectedThread?.id
    });

    // Update thread comments when content is fetched
    useEffect(() => {
        if (threadContent?.posts) {
            setThreadComments(threadContent.posts.slice(1)); // Skip the first post as it's the OP
        }
    }, [threadContent]);

    const handleCustomBoardSubmit = (e) => {
        e.preventDefault();
        if (customBoard.trim()) {
            refetch();
        }
    };

    const handleConvertToPost = async (thread) => {
        if (!authUser) {
            toast.error('Please log in to convert threads');
            navigate('/login');
            return;
        }

        setSelectedThread(thread);
        setShowPreview(true);
    };

    const handlePreviewConvert = async () => {
        if (!authUser) {
            toast.error('Please log in to convert threads');
            navigate('/login');
            return;
        }

        if (!targetBoard) {
            toast.error('Please select a board');
            return;
        }

        try {
            const response = await axios.post(
                `/api/leech/4chan/${selectedBoard}/convert/${selectedThread.id}`,
                {
                    repostType: 'board',
                    targetBoard: targetBoard,
                    threadData: {
                        subject: selectedThread.subject,
                        content: selectedThread.comment,
                        imageUrl: selectedThread.image,
                        originalThreadUrl: `https://boards.4channel.org/${selectedBoard}/thread/${selectedThread.id}`,
                        metadata: {
                            replies: selectedThread.replies,
                            images: selectedThread.images,
                            timestamp: selectedThread.timestamp,
                            comments: threadComments.map(comment => ({
                                content: comment.comment,
                                imageUrl: comment.image,
                                timestamp: comment.timestamp
                            }))
                        }
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.data.success) {
                toast.success('Thread converted successfully!');
                setShowPreview(false);
                setSelectedThread(null);
                setTargetBoard('');
                setThreadComments([]);
            }
        } catch (error) {
            console.error('Error converting thread:', error);
            if (error.response?.status === 401) {
                toast.error('Your session has expired. Please log in again.');
                navigate('/login');
            } else {
                toast.error(error.response?.data?.error || 'Failed to convert thread');
            }
        }
    };

    const handleThreadClick = (threadId) => {
        navigate(`/thread/${selectedBoard}/${threadId}`);
    };

    // Show error toast if there's an error
    useEffect(() => {
        if (error) {
            toast.error(error.message || 'Failed to fetch threads');
        }
    }, [error]);

    const getGridClass = () => {
        switch (gridColumns) {
            case 2: return 'grid-cols-2';
            case 3: return 'grid-cols-3';
            case 4: return 'grid-cols-4';
            case 5: return 'grid-cols-5';
            default: return 'grid-cols-3';
        }
    };

    if (showPreview && selectedThread) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex items-center mb-4">
                    <button
                        onClick={() => {
                            setShowPreview(false);
                            setSelectedThread(null);
                            setTargetBoard('');
                            setThreadComments([]);
                        }}
                        className="flex items-center text-gray-400 hover:text-white transition-colors"
                    >
                        <FaArrowLeft className="mr-2" />
                        Back to Threads
                    </button>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-4">Preview Thread</h2>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Select Target Board
                        </label>
                        {isLoadingBoards ? (
                            <div className="flex items-center justify-center p-4">
                                <LoadingSpinner />
                            </div>
                        ) : boards?.length === 0 ? (
                            <div className="text-center p-4 bg-gray-700 rounded-lg">
                                <p className="text-gray-400">You don't have any boards to post to.</p>
                                <button
                                    onClick={() => navigate('/boards/create')}
                                    className="mt-2 text-blue-500 hover:text-blue-400"
                                >
                                    Create a Board
                                </button>
                            </div>
                        ) : (
                            <select
                                value={targetBoard}
                                onChange={(e) => setTargetBoard(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                            >
                                <option value="">Select a board</option>
                                {boards?.map((board) => (
                                    <option key={board._id} value={board._id}>
                                        {board.name} {board.isOwner ? '(Owner)' : '(Following)'}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">
                                {selectedThread.subject || `Thread #${selectedThread.id}`}
                            </h3>
                            {selectedThread.image && (
                                <div className="mb-4">
                                    <img
                                        src={selectedThread.image}
                                        alt="Thread image"
                                        className="max-w-full h-auto rounded"
                                    />
                                </div>
                            )}
                            <div className="prose prose-invert max-w-none">
                                {selectedThread.comment}
                            </div>
                        </div>

                        {/* Comments Preview */}
                        {threadComments.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-lg font-semibold mb-4">Comments ({threadComments.length})</h4>
                                <div className="space-y-4">
                                    {threadComments.map((comment, index) => (
                                        <div key={index} className="bg-gray-700 rounded-lg p-4">
                                            {comment.image && (
                                                <div className="mb-2">
                                                    <img
                                                        src={comment.image}
                                                        alt="Comment image"
                                                        className="max-w-full h-auto rounded"
                                                    />
                                                </div>
                                            )}
                                            <div className="prose prose-invert max-w-none">
                                                {comment.comment}
                                            </div>
                                            <div className="text-sm text-gray-400 mt-2">
                                                {new Date(comment.timestamp * 1000).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-gray-400">
                            <div className="flex items-center space-x-4">
                                <span>Replies: {selectedThread.replies}</span>
                                <span>Images: {selectedThread.images}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-2">
                        <button
                            onClick={() => {
                                setShowPreview(false);
                                setSelectedThread(null);
                                setTargetBoard('');
                                setThreadComments([]);
                            }}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePreviewConvert}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            disabled={!targetBoard || isLoadingBoards}
                        >
                            Convert to Post
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8 border-t border-gray-700 pt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Leeches</h2>
                <div className="flex gap-4">
                    {!showCustomInput ? (
                        <>
                            <select
                                value={selectedBoard}
                                onChange={(e) => setSelectedBoard(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                            >
                                <option value="biz">/biz/ - Business & Finance</option>
                                <option value="pol">/pol/ - Politically Incorrect</option>
                                <option value="b">/b/ - Random</option>
                                <option value="g">/g/ - Technology</option>
                                <option value="a">/a/ - Anime & Manga</option>
                                <option value="v">/v/ - Video Games</option>
                                <option value="gif">/gif/ - GIFs</option>
                                <option value="wsg">/wsg/ - Wallpapers</option>
                                <option value="fit">/fit/ - Fitness</option>
                                <option value="mu">/mu/ - Music</option>
                                <option value="tv">/tv/ - Television & Film</option>
                                <option value="k">/k/ - Weapons</option>
                                <option value="sci">/sci/ - Science & Math</option>
                                <option value="his">/his/ - History & Humanities</option>
                                <option value="lit">/lit/ - Literature</option>
                                <option value="sp">/sp/ - Sports</option>
                                <option value="fa">/fa/ - Fashion</option>
                                <option value="ck">/ck/ - Food & Cooking</option>
                                <option value="diy">/diy/ - Do It Yourself</option>
                                <option value="trv">/trv/ - Travel</option>
                                <option value="out">/out/ - Outdoors</option>
                                <option value="toy">/toy/ - Toys</option>
                                <option value="po">/po/ - Papercraft & Origami</option>
                                <option value="p">/p/ - Photography</option>
                                <option value="o">/o/ - Auto</option>
                                <option value="n">/n/ - Transportation</option>
                                <option value="w">/w/ - Anime/Wallpapers</option>
                                <option value="wg">/wg/ - Wallpapers/General</option>
                                <option value="i">/i/ - Oekaki</option>
                                <option value="ic">/ic/ - Artwork/Critique</option>
                                <option value="r">/r/ - Request</option>
                                <option value="r9k">/r9k/ - ROBOT9001</option>
                                <option value="s4s">/s4s/ - Shit 4chan Says</option>
                                <option value="cm">/cm/ - Cute/Male</option>
                                <option value="y">/y/ - Yaoi</option>
                                <option value="3">/3/ - 3DCG</option>
                                <option value="adv">/adv/ - Advice</option>
                                <option value="an">/an/ - Animals & Nature</option>
                                <option value="asp">/asp/ - Alternative Sports</option>
                                <option value="bant">/bant/ - International/Random</option>
                                <option value="biz">/biz/ - Business & Finance</option>
                                <option value="c">/c/ - Anime/Cute</option>
                                <option value="cgl">/cgl/ - Cosplay & EGL</option>
                                <option value="co">/co/ - Comics & Cartoons</option>
                                <option value="d">/d/ - Hentai/Alternative</option>
                                <option value="diy">/diy/ - Do It Yourself</option>
                                <option value="e">/e/ - Ecchi</option>
                                <option value="f">/f/ - Flash</option>
                                <option value="fa">/fa/ - Fashion</option>
                                <option value="fit">/fit/ - Fitness</option>
                                <option value="g">/g/ - Technology</option>
                                <option value="gd">/gd/ - Graphic Design</option>
                                <option value="gif">/gif/ - GIFs</option>
                                <option value="h">/h/ - Hentai</option>
                                <option value="hc">/hc/ - Hardcore</option>
                                <option value="his">/his/ - History & Humanities</option>
                                <option value="hm">/hm/ - Handsome Men</option>
                                <option value="hr">/hr/ - High Resolution</option>
                                <option value="i">/i/ - Oekaki</option>
                                <option value="ic">/ic/ - Artwork/Critique</option>
                                <option value="int">/int/ - International</option>
                                <option value="jp">/jp/ - Otaku Culture</option>
                                <option value="k">/k/ - Weapons</option>
                                <option value="lit">/lit/ - Literature</option>
                                <option value="m">/m/ - Mecha</option>
                                <option value="mlp">/mlp/ - Pony</option>
                                <option value="mu">/mu/ - Music</option>
                                <option value="n">/n/ - Transportation</option>
                                <option value="news">/news/ - Current News</option>
                                <option value="o">/o/ - Auto</option>
                                <option value="out">/out/ - Outdoors</option>
                                <option value="p">/p/ - Photography</option>
                                <option value="po">/po/ - Papercraft & Origami</option>
                                <option value="pol">/pol/ - Politically Incorrect</option>
                                <option value="r">/r/ - Request</option>
                                <option value="r9k">/r9k/ - ROBOT9001</option>
                                <option value="s">/s/ - Sexy Beautiful Women</option>
                                <option value="s4s">/s4s/ - Shit 4chan Says</option>
                                <option value="sci">/sci/ - Science & Math</option>
                                <option value="sp">/sp/ - Sports</option>
                                <option value="t">/t/ - Torrents</option>
                                <option value="tg">/tg/ - Traditional Games</option>
                                <option value="toy">/toy/ - Toys</option>
                                <option value="trash">/trash/ - Off-topic</option>
                                <option value="trv">/trv/ - Travel</option>
                                <option value="tv">/tv/ - Television & Film</option>
                                <option value="u">/u/ - Yuri</option>
                                <option value="v">/v/ - Video Games</option>
                                <option value="vg">/vg/ - Video Game Generals</option>
                                <option value="vip">/vip/ - Very Important Posts</option>
                                <option value="vr">/vr/ - Retro Games</option>
                                <option value="w">/w/ - Anime/Wallpapers</option>
                                <option value="wg">/wg/ - Wallpapers/General</option>
                                <option value="wsg">/wsg/ - Wallpapers</option>
                                <option value="x">/x/ - Paranormal</option>
                                <option value="y">/y/ - Yaoi</option>
                            </select>
                            <button
                                onClick={() => setShowCustomInput(true)}
                                className="p-2 text-blue-500 hover:text-blue-400 rounded-full hover:bg-blue-500/10"
                                title="Enter Custom Board"
                            >
                                <FaPlus className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleCustomBoardSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={customBoard}
                                onChange={(e) => setCustomBoard(e.target.value)}
                                placeholder="Enter board name (e.g., biz)"
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                            />
                            <button
                                type="submit"
                                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                Load
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCustomInput(false);
                                    setCustomBoard('');
                                }}
                                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </form>
                    )}
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-blue-500 hover:text-blue-400 rounded-full hover:bg-blue-500/10"
                        title="Refresh Threads"
                    >
                        <FaSync className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <div className="text-center text-red-500 py-4">
                    {error.message || 'Failed to load threads'}
                </div>
            ) : !threads || threads.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                    No threads found
                </div>
            ) : (
                <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                title="List View"
                            >
                                <FaList />
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('grid');
                                    setGridColumns(2);
                                }}
                                className={`p-2 rounded ${viewMode === 'grid' && gridColumns === 2 ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                title="2 Columns"
                            >
                                2
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('grid');
                                    setGridColumns(3);
                                }}
                                className={`p-2 rounded ${viewMode === 'grid' && gridColumns === 3 ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                title="3 Columns"
                            >
                                3
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('grid');
                                    setGridColumns(4);
                                }}
                                className={`p-2 rounded ${viewMode === 'grid' && gridColumns === 4 ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                title="4 Columns"
                            >
                                4
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('grid');
                                    setGridColumns(5);
                                }}
                                className={`p-2 rounded ${viewMode === 'grid' && gridColumns === 5 ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                title="5 Columns"
                            >
                                5
                            </button>
                        </div>
                    </div>

                    {viewMode === 'list' ? (
                        <div className="space-y-4">
                            {threads?.map((thread) => (
                                <div 
                                    key={thread.id} 
                                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => handleThreadClick(thread.id)}
                                >
                                    <div className="flex items-start space-x-4">
                                        {thread.image && (
                                            <div className="flex-shrink-0 w-32 h-32">
                                                <img
                                                    src={thread.image}
                                                    alt="Thread thumbnail"
                                                    className="w-full h-full object-cover rounded"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-lg font-semibold">{thread.subject || `Thread #${thread.id}`}</h3>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleConvertToPost(thread);
                                                    }}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Convert
                                                </button>
                                            </div>
                                            <p className="text-gray-600 mb-2 line-clamp-3">{thread.comment}</p>
                                            <div className="flex items-center justify-between text-sm text-gray-500">
                                                <div className="flex items-center space-x-4">
                                                    <span>Replies: {thread.replies}</span>
                                                    <span>Images: {thread.images}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${getGridClass()} auto-rows-min`}>
                            {threads?.map((thread) => (
                                <div 
                                    key={thread.id} 
                                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-fit"
                                    onClick={() => handleThreadClick(thread.id)}
                                >
                                    {thread.image && (
                                        <div className="aspect-w-16 aspect-h-9">
                                            <img
                                                src={thread.image}
                                                alt="Thread thumbnail"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-semibold line-clamp-2">
                                                {thread.subject || `Thread #${thread.id}`}
                                            </h3>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleConvertToPost(thread);
                                                }}
                                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                                            >
                                                Convert
                                            </button>
                                        </div>
                                        <p className="text-gray-600 mb-4 line-clamp-3">{thread.comment}</p>
                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <div className="flex items-center space-x-4">
                                                <span>Replies: {thread.replies}</span>
                                                <span>Images: {thread.images}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LeechesSection; 