import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FaArrowLeft, FaReply, FaImage, FaTimes, FaRetweet } from 'react-icons/fa';
import { io } from 'socket.io-client';

const ThreadConnector = ({ fromX, fromY, toX, toY, level = 0, isReply = false }) => {
    const controlOffset = isReply ? 120 : 150;
    const minX = Math.min(fromX, toX) - 50;
    const minY = Math.min(fromY, toY) - 150;
    const width = Math.abs(fromX - toX) + 100;
    const height = Math.abs(fromY - toY) + 200;

    const relFromX = fromX - minX;
    const relFromY = fromY - minY - 70;
    const relToX = toX - minX;
    const relToY = toY - minY;

    const pathData = `
        M ${relFromX},${relFromY}
        L ${relFromX},${relToY - controlOffset}
        C ${relFromX},${relToY - controlOffset/2}
          ${relToX - controlOffset/2},${relToY - controlOffset/2}
          ${relToX},${relToY}
    `;

    return (
        <svg 
            className="absolute pointer-events-none" 
            style={{ 
                left: minX,
                top: minY,
                width,
                height,
                zIndex: 1,
                position: 'absolute'
            }}
        >
            <path 
                d={pathData} 
                stroke="rgba(75, 85, 99, 0.4)"
                strokeWidth="2" 
                fill="none"
                className="transition-all duration-300 ease-in-out"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

const ThreadPage = () => {
    const { board, threadId } = useParams();
    const navigate = useNavigate();
    const [isConverting, setIsConverting] = useState(false);
    const [showRepostModal, setShowRepostModal] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [selectedTargetBoard, setSelectedTargetBoard] = useState('');
    const [userBoards, setUserBoards] = useState([]);
    const [followingBoards, setFollowingBoards] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [connectorPoints, setConnectorPoints] = useState({});
    const postRefs = useRef({});
    const MAX_RETRIES = 3;
    const [isReposting, setIsReposting] = useState(false);
    const [repostType, setRepostType] = useState('personal'); // 'personal' or 'board'

    // Fetch user data
    const { data: userData, isLoading: isLoadingUser } = useQuery({
        queryKey: ['authUser'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const storedUserData = localStorage.getItem('userData');
            
            console.log('[ThreadPage] Auth check:', {
                hasToken: !!token,
                hasStoredUserData: !!storedUserData,
                token: token ? `${token.substring(0, 10)}...` : null,
                storedUserData: storedUserData ? JSON.parse(storedUserData) : null
            });
            
            if (!token) {
                console.log('[ThreadPage] No token found');
                return null;
            }
            
            try {
                // If we have stored user data, use it
                if (storedUserData) {
                    const parsedData = JSON.parse(storedUserData);
                    console.log('[ThreadPage] Using stored user data:', {
                        hasId: !!parsedData._id,
                        hasToken: !!parsedData.token,
                        data: parsedData
                    });
                    return parsedData;
                }
                
                // Otherwise fetch fresh data
                console.log('[ThreadPage] Fetching fresh user data...');
                const response = await axios.get('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log('[ThreadPage] User data fetched:', {
                    success: response.data.success,
                    hasData: !!response.data.data,
                    data: response.data
                });
                
                if (response.data.success && response.data.data) {
                    const userData = response.data.data;
                    localStorage.setItem('userData', JSON.stringify(userData));
                    return userData;
                } else {
                    throw new Error('Invalid user data response');
                }
            } catch (error) {
                console.error('[ThreadPage] Error fetching user data:', {
                    error: error.message,
                    response: error.response?.data,
                    status: error.response?.status
                });
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userData');
                }
                return null;
            }
        },
        retry: false
    });

    // Fetch user's boards and following boards
    const { data: boardsData, isLoading: isLoadingBoards } = useQuery({
        queryKey: ['userBoards'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found for boards fetch');
                return { userBoards: [], followingBoards: [] };
            }
            
            try {
                const response = await axios.get('/api/boards/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log('Boards data fetched:', response.data);
                return response.data;
            } catch (error) {
                console.error('Error fetching boards:', error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userData');
                }
                return { userBoards: [], followingBoards: [] };
            }
        },
        enabled: !!userData,
        retry: false
    });

    useEffect(() => {
        if (boardsData) {
            setUserBoards(boardsData.userBoards || []);
            setFollowingBoards(boardsData.followingBoards || []);
        }
    }, [boardsData]);

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['thread', board, threadId],
        queryFn: async () => {
            try {
                console.log('Fetching thread:', board, threadId);
                const response = await axios.get(`/api/leech/4chan/${board}/thread/${threadId}`);
                console.log('Raw thread response:', response);
                console.log('Thread data:', response.data);
                return response.data;
            } catch (error) {
                console.error('Error fetching thread:', error);
                throw error;
            }
        }
    });

    useEffect(() => {
        if (response) {
            console.log('Response in component:', response);
            console.log('Posts data:', response.data);
            console.log('OP:', response.data?.posts?.[0]);
            console.log('Replies:', response.data?.posts?.slice(1));
        }
    }, [response]);

    // Initialize WebSocket connection
    useEffect(() => {
        let socket = null;
        let reconnectTimer = null;

        const connectSocket = () => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }

            // Clear any existing reconnect timer
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }

            const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            console.log('Attempting to connect to socket server at:', socketUrl);

            socket = io(socketUrl, {
                path: '/socket.io/',
                transports: ['polling'], // Start with polling only
                reconnection: false, // We'll handle reconnection manually
                timeout: 5000, // Shorter timeout
                autoConnect: true,
                withCredentials: true,
                forceNew: true
            });

            socket.on('connect', () => {
                console.log('Socket connected successfully');
                setIsConnected(true);
                setRetryCount(0);
                
                // After successful connection, try upgrading to WebSocket
                socket.io.opts.transports = ['polling', 'websocket'];
            });

            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                setIsConnected(false);
                
                // Clear any existing reconnect timer
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                }

                // If we haven't exceeded max retries, try to reconnect
                if (retryCount < MAX_RETRIES) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff
                    console.log(`Retrying connection in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                    
                    reconnectTimer = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        connectSocket();
                    }, delay);
                } else {
                    console.log('Max retry attempts reached, giving up');
                    toast.error('Unable to connect to server. Some features may be limited.');
                }
            });

            socket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                setIsConnected(false);
                
                // Only attempt to reconnect if it wasn't a client-side disconnect
                if (reason !== 'io client disconnect') {
                    if (retryCount < MAX_RETRIES) {
                        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
                        reconnectTimer = setTimeout(() => {
                            setRetryCount(prev => prev + 1);
                            connectSocket();
                        }, delay);
                    }
                }
            });

            setSocket(socket);
        };

        // Initial connection attempt
        connectSocket();

        // Cleanup function
        return () => {
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };
    }, [retryCount]);

    const handleRepost = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.error('[ThreadPage] No token found');
                toast.error('Please log in to repost');
                navigate('/login');
                return;
            }

            if (!userData || !userData._id) {
                console.error('[ThreadPage] Invalid user data:', userData);
                toast.error('Please log in to repost');
                navigate('/login');
                return;
            }

            setIsReposting(true);

            // Find the post to repost
            let postToRepost;
            if (postId) {
                postToRepost = response?.data?.posts?.find(post => post.id === postId);
                console.log('[ThreadPage] Looking for reply:', { postId, found: !!postToRepost });
            } else {
                postToRepost = response?.data?.posts?.[0];
                console.log('[ThreadPage] Using OP:', postToRepost);
            }

            if (!postToRepost) {
                console.error('[ThreadPage] Post not found:', { 
                    postId, 
                    responseData: response?.data,
                    posts: response?.data?.posts
                });
                toast.error('Post not found');
                return;
            }

            console.log('[ThreadPage] Post to repost:', postToRepost);

            // Handle image if present
            let cloudinaryImageUrl = null;
            if (postToRepost.image) {
                try {
                    console.log('[ThreadPage] Starting image processing for:', postToRepost.image);
                    
                    // First, download the image from 4chan using our proxy
                    // Extract the image ID from the URL
                    const imageId = postToRepost.image.split('/').pop();
                    const proxyUrl = `/api/leech/4chan/image/${board}/${imageId}`;
                    console.log('[ThreadPage] Attempting to download image from proxy:', proxyUrl);
                    
                    // Use blob response type instead of arraybuffer
                    const imageResponse = await axios.get(proxyUrl, {
                        responseType: 'blob',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    console.log('[ThreadPage] Image download response:', {
                        status: imageResponse.status,
                        contentType: imageResponse.headers['content-type'],
                        size: imageResponse.data.size,
                        headers: imageResponse.headers
                    });

                    // Convert blob to base64
                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                    });
                    reader.readAsDataURL(imageResponse.data);
                    const base64Data = await base64Promise;
                    
                    console.log('[ThreadPage] Image converted to base64:', {
                        dataUrlLength: base64Data.length,
                        contentType: imageResponse.headers['content-type']
                    });

                    // Upload to Cloudinary through our backend
                    console.log('[ThreadPage] Attempting to upload to Cloudinary...');
                    const uploadResponse = await axios.post('/api/upload/cloudinary', {
                        image: base64Data,
                        folder: '4chan-reposts'
                    }, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log('[ThreadPage] Cloudinary upload response:', {
                        success: uploadResponse.data?.success,
                        url: uploadResponse.data?.url,
                        error: uploadResponse.data?.error,
                        fullResponse: uploadResponse.data
                    });

                    if (uploadResponse.data && uploadResponse.data.url) {
                        cloudinaryImageUrl = uploadResponse.data.url;
                        console.log('[ThreadPage] Successfully got Cloudinary URL:', cloudinaryImageUrl);
                    } else {
                        throw new Error('Failed to upload image to Cloudinary: ' + JSON.stringify(uploadResponse.data));
                    }
                } catch (error) {
                    console.error('[ThreadPage] Error in image processing:', {
                        error: error.message,
                        response: error.response?.data,
                        status: error.response?.status,
                        stack: error.stack,
                        postData: postToRepost,
                        imageUrl: postToRepost.image
                    });
                    toast.error('Failed to process image. Posting without image.');
                }
            } else {
                console.log('[ThreadPage] No image to process in post:', postToRepost);
            }

            // Prepare the post data
            const postData = {
                text: postToRepost.comment || '',
                img: cloudinaryImageUrl,
                author: userData._id,
                title: postToRepost.subject || `Thread #${threadId}`,
                metadata: {
                    source: {
                        type: '4chan',
                        board: board,
                        threadId: threadId,
                        postId: postToRepost.id,
                        originalUrl: window.location.href,
                        originalImage: postToRepost.image
                    },
                    imageSize: 'full-width',
                    layout: 'image-top',
                    imageStyle: {
                        width: '100%',
                        maxWidth: '100%',
                        height: 'auto',
                        objectFit: 'contain'
                    },
                    imageToggle: {
                        enabled: true,
                        defaultSize: 'compact',
                        compactStyle: {
                            maxHeight: '300px',
                            width: 'auto',
                            objectFit: 'contain'
                        },
                        fullStyle: {
                            width: '100%',
                            maxWidth: '100%',
                            height: 'auto',
                            objectFit: 'contain'
                        }
                    },
                    quote: {
                        text: postToRepost.comment || '',
                        author: postToRepost.name || 'Anonymous',
                        timestamp: postToRepost.timestamp,
                        source: {
                            type: '4chan',
                            board: board,
                            threadId: threadId,
                            postId: postToRepost.id,
                            url: `https://boards.4channel.org/${board}/thread/${threadId}#p${postToRepost.id}`
                        }
                    }
                },
                isRepost: true,
                repostType: repostType,
                targetBoard: repostType === 'board' ? selectedTargetBoard : undefined
            };

            console.log('[ThreadPage] Final post data:', {
                hasImage: !!cloudinaryImageUrl,
                imageUrl: cloudinaryImageUrl,
                originalImage: postToRepost.image,
                postData: postData
            });

            // Process greentext in the comment
            if (postData.text) {
                postData.text = postData.text.split('\n').map(line => {
                    if (line.trim().startsWith('>') && !line.trim().startsWith('>>')) {
                        return `<span class="text-green-500">${line}</span>`;
                    }
                    return line;
                }).join('\n');
            }

            // Add quote header to the text
            const quoteHeader = `Reposted from /${board}/ Thread #${threadId}\nOriginal post by ${postToRepost.name || 'Anonymous'} on ${new Date(postToRepost.timestamp * 1000).toLocaleString()}\n\n`;
            postData.text = quoteHeader + postData.text;

            console.log('[ThreadPage] Creating new post with data:', postData);

            // Create the new post
            const createResponse = await axios.post(
                '/api/posts/create',
                postData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('[ThreadPage] Post creation response:', createResponse.data);

            if (createResponse.data) {
                toast.success('Successfully reposted!');
                setShowRepostModal(false);
                setSelectedPostId(null);
                setSelectedTargetBoard('');
                setRepostType('personal');
            } else {
                throw new Error(createResponse.data.error || 'Failed to create post');
            }
        } catch (error) {
            console.error('[ThreadPage] Error during post creation:', {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                toast.error('Session expired. Please log in again.');
                navigate('/login');
            } else {
                toast.error(error.response?.data?.error || 'Failed to create post');
            }
        } finally {
            setIsReposting(false);
        }
    };

    const updateConnectorPoints = () => {
        const points = {};
        const posts = response?.data?.posts || [];
        
        posts.forEach((post, index) => {
            if (index === 0) return; // Skip OP
            
            const prevPost = posts[index - 1];
            const prevRef = postRefs.current[prevPost.id];
            const currentRef = postRefs.current[post.id];
            
            if (prevRef && currentRef) {
                const prevRect = prevRef.getBoundingClientRect();
                const currentRect = currentRef.getBoundingClientRect();
                
                points[post.id] = {
                    fromX: prevRect.left + prevRect.width / 2,
                    fromY: prevRect.top + prevRect.height,
                    toX: currentRect.left + currentRect.width / 2,
                    toY: currentRect.top,
                    level: 0,
                    isReply: true
                };
            }
        });
        
        setConnectorPoints(points);
    };

    useEffect(() => {
        if (response?.data) {
            updateConnectorPoints();
        }
    }, [response]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500">Error loading thread: {error.message}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (!response?.success || !response?.data?.posts || response.data.posts.length === 0) {
        console.log('No valid thread data:', response);
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Thread not found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const posts = response.data.posts;
    console.log('Posts array:', posts);
    
    if (!Array.isArray(posts) || posts.length === 0) {
        console.log('Invalid posts array:', posts);
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Invalid thread data</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const op = posts[0];
    const replies = posts.slice(1);

    console.log('OP:', op);
    console.log('Replies:', replies);

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="mb-6 flex items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
                >
                    <FaArrowLeft />
                    <span>Back to Board</span>
                </button>
            </div>

            {/* Original Post */}
            <div 
                ref={el => postRefs.current[op.id] = el}
                className="bg-white rounded-lg shadow-md p-6 mb-6 relative group hover:shadow-lg transition-shadow duration-200"
            >
                <button
                    onClick={() => {
                        setSelectedPostId(null);
                        setShowRepostModal(true);
                    }}
                    className="absolute top-4 right-4 text-blue-500 hover:text-blue-600"
                    title="Repost this post"
                >
                    <FaRetweet className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold mb-4 text-gray-700">
                    {op.subject || `Thread #${threadId}`}
                </h1>
                {op.image && (
                    <div className="mb-4">
                        <img
                            src={`/api/proxy/4chan-image?url=${encodeURIComponent(op.image)}`}
                            alt="Thread image"
                            className="max-w-full h-auto rounded"
                            onError={(e) => {
                                console.error('[ThreadPage] Error loading image:', op.image);
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                )}
                <div className="prose max-w-none text-gray-700">
                    {op.comment}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                    Posted: {new Date(op.timestamp * 1000).toLocaleString()}
                </div>
            </div>

            {/* Replies */}
            <div className="space-y-4">
                {replies.map((reply) => (
                    <div 
                        key={reply.id}
                        ref={el => postRefs.current[reply.id] = el}
                        className="bg-white rounded-lg shadow-md p-4 relative group hover:shadow-lg transition-shadow duration-200"
                    >
                        {connectorPoints[reply.id] && (
                            <ThreadConnector {...connectorPoints[reply.id]} />
                        )}
                        <button
                            onClick={() => {
                                setSelectedPostId(reply.id);
                                setShowRepostModal(true);
                            }}
                            className="absolute top-4 right-4 text-blue-500 hover:text-blue-600"
                            title="Repost this reply"
                        >
                            <FaRetweet className="w-5 h-5" />
                        </button>
                        {reply.image && (
                            <div className="mb-4">
                                <img
                                    src={`/api/proxy/4chan-image?url=${encodeURIComponent(reply.image)}`}
                                    alt="Reply image"
                                    className="max-w-full h-auto rounded"
                                    onError={(e) => {
                                        console.error('[ThreadPage] Error loading image:', reply.image);
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                        <div className="prose max-w-none text-gray-700">
                            {reply.comment}
                        </div>
                        <div className="mt-4 text-sm text-gray-500">
                            Posted: {new Date(reply.timestamp * 1000).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Repost Modal */}
            {showRepostModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Repost Options</h2>
                            <button
                                onClick={() => {
                                    setShowRepostModal(false);
                                    setSelectedPostId(null);
                                    setSelectedTargetBoard('');
                                    setRepostType('personal');
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        
                        {isLoadingUser || isLoadingBoards ? (
                            <div className="flex justify-center items-center p-4">
                                <LoadingSpinner />
                            </div>
                        ) : !userData ? (
                            <div className="text-center p-4">
                                <p className="text-red-500 mb-4">Please log in to repost</p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Go to Login
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex space-x-4 mb-4">
                                    <button
                                        onClick={() => setRepostType('personal')}
                                        className={`flex-1 p-3 text-center rounded-lg ${
                                            repostType === 'personal'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Post to Feed
                                    </button>
                                    <button
                                        onClick={() => setRepostType('board')}
                                        className={`flex-1 p-3 text-center rounded-lg ${
                                            repostType === 'board'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        Post to Board
                                    </button>
                                </div>

                                {repostType === 'board' && (
                                    <div className="space-y-4">
                                        {userBoards.length > 0 && (
                                            <div>
                                                <h3 className="font-medium mb-2">Your Boards</h3>
                                                <div className="space-y-2">
                                                    {userBoards.map(board => (
                                                        <button
                                                            key={board._id}
                                                            onClick={() => setSelectedTargetBoard(board.name)}
                                                            className={`w-full p-3 text-left rounded-lg ${
                                                                selectedTargetBoard === board.name
                                                                    ? 'bg-blue-100 border-2 border-blue-500'
                                                                    : 'bg-gray-100 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            <div className="font-medium">{board.name}</div>
                                                            <div className="text-sm text-gray-500">{board.description}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {followingBoards.length > 0 && (
                                            <div>
                                                <h3 className="font-medium mb-2">Following Boards</h3>
                                                <div className="space-y-2">
                                                    {followingBoards.map(board => (
                                                        <button
                                                            key={board._id}
                                                            onClick={() => setSelectedTargetBoard(board.name)}
                                                            className={`w-full p-3 text-left rounded-lg ${
                                                                selectedTargetBoard === board.name
                                                                    ? 'bg-blue-100 border-2 border-blue-500'
                                                                    : 'bg-gray-100 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            <div className="font-medium">{board.name}</div>
                                                            <div className="text-sm text-gray-500">{board.description}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {userBoards.length === 0 && followingBoards.length === 0 && (
                                            <div className="text-center p-4">
                                                <p className="text-gray-500">No boards available</p>
                                                <button
                                                    onClick={() => navigate('/boards/create')}
                                                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                >
                                                    Create a Board
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={() => handleRepost(selectedPostId)}
                                    disabled={isReposting || (repostType === 'board' && !selectedTargetBoard)}
                                    className={`w-full p-3 text-center rounded-lg ${
                                        isReposting || (repostType === 'board' && !selectedTargetBoard)
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                >
                                    {isReposting ? (
                                        <div className="flex items-center justify-center">
                                            <LoadingSpinner size="sm" />
                                            <span className="ml-2">Reposting...</span>
                                        </div>
                                    ) : (
                                        `Repost to ${repostType === 'personal' ? 'Feed' : selectedTargetBoard || 'Board'}`
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThreadPage; 