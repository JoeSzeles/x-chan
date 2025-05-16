import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LeechesSection = () => {
    const [selectedBoard, setSelectedBoard] = useState('b'); // Default to /b/
    const [threads, setThreads] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const { data: authUser } = useQuery({ queryKey: ["authUser"] });

    const fetchThreads = useCallback(async () => {
        if (!selectedBoard) return;

        setIsLoading(true);
        setError(null);

        try {
            console.log(`[LeechesSection] Fetching threads for board: ${selectedBoard}`);
            
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/leech/4chan/${selectedBoard}/catalog`, {
                credentials: "include",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            console.log(`[LeechesSection] Response status: ${res.status}`);
            
            if (!res.ok) {
                throw new Error(`Failed to fetch threads: ${res.statusText}`);
            }

            const data = await res.json();
            console.log(`[LeechesSection] Response data:`, data);

            if (data.success) {
                // Process images through CORS proxy
                const processedThreads = data.data.map(thread => ({
                    ...thread,
                    image: thread.image ? `${import.meta.env.VITE_API_URL}/api/proxy/image?url=${encodeURIComponent(thread.image)}` : null
                }));
                setThreads(processedThreads);
            } else {
                throw new Error(data.error || 'Failed to fetch threads');
            }
        } catch (err) {
            console.error('[LeechesSection] Error fetching threads:', err);
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedBoard]);

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    const handleConvertToPost = async (threadId) => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || 'null');

            if (!token || !user) {
                console.log('[LeechesSection] No token or user found:', { 
                    hasToken: !!token, 
                    hasUser: !!user 
                });
                toast.error('Please log in to convert threads');
                navigate('/login');
                return;
            }

            console.log('[LeechesSection] Converting thread:', {
                board: selectedBoard,
                threadId,
                userId: user._id,
                hasToken: !!token
            });

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/leech/4chan/${selectedBoard}/convert/${threadId}`,
                {
                    repostType: 'personal', // Default to personal repost
                    targetBoard: '' // Empty for personal reposts
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (response.data.success) {
                toast.success('Thread converted to post successfully!');
                // Refresh the threads list
                fetchThreads();
            } else {
                throw new Error(response.data.error || 'Failed to convert thread');
            }
        } catch (error) {
            console.error('[LeechesSection] Error converting thread:', error);
            toast.error(error.response?.data?.error || 'Failed to convert thread');
        }
    };

    const handleBoardChange = (e) => {
        setSelectedBoard(e.target.value);
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <label htmlFor="board-select" className="block text-sm font-medium text-gray-300 mb-2">
                    Select Board
                </label>
                <select
                    id="board-select"
                    value={selectedBoard}
                    onChange={handleBoardChange}
                    className="bg-gray-700 text-white rounded px-3 py-2 w-full"
                >
                    <option value="b">/b/ - Random</option>
                    <option value="g">/g/ - Technology</option>
                    <option value="pol">/pol/ - Politically Incorrect</option>
                    <option value="biz">/biz/ - Business & Finance</option>
                    <option value="a">/a/ - Anime & Manga</option>
                </select>
            </div>

            <div className="grid gap-4">
                {threads.map((thread) => (
                    <div key={thread.id} className="bg-[#1e1e1e] rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold">{thread.subject || `Thread #${thread.id}`}</h3>
                            <button
                                onClick={() => handleConvertToPost(thread.id)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            >
                                Convert
                            </button>
                        </div>
                        <p className="text-gray-400 mb-4">{thread.comment}</p>
                        {thread.image && (
                            <img 
                                src={thread.image} 
                                alt="Thread image" 
                                className="max-w-full h-auto rounded-lg"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/image-placeholder.png';
                                }}
                            />
                        )}
                        <div className="mt-4 flex justify-between text-sm text-gray-500">
                            <span>Posted: {new Date(thread.timestamp * 1000).toLocaleString()}</span>
                            <span>Replies: {thread.replies}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LeechesSection; 