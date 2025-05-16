import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { FaImage, FaSmile, FaTwitter } from "react-icons/fa";
import EmojiPicker from "./EmojiPicker";
import LoadingSpinner from "./LoadingSpinner";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { formatPostNumber } from "../../utils/postNumberUtils";
import QuoteText from "./QuoteText";

// Add image compression utility
const compressImage = async (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions while maintaining aspect ratio
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (leaving 1MB buffer for other data)
                
                // Calculate scaling factor
                let scale = 1;
                    if (width > MAX_WIDTH) {
                    scale = MAX_WIDTH / width;
                    }
                if (height * scale > MAX_HEIGHT) {
                    scale = MAX_HEIGHT / height;
                }
                
                // Apply scaling
                width = Math.round(width * scale);
                height = Math.round(height * scale);
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Start with high quality
                let quality = 0.9;
                let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                
                // If still too large, reduce quality until it fits
                while (compressedBase64.length > MAX_FILE_SIZE && quality > 0.1) {
                    quality -= 0.1;
                    compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                }
                
                // If still too large after quality reduction, try reducing dimensions
                if (compressedBase64.length > MAX_FILE_SIZE) {
                    scale *= 0.8; // Reduce dimensions by 20%
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                }
                
                resolve(compressedBase64);
            };
        };
    });
};

// Helper function to extract Twitter post ID
const extractTwitterPostId = (url) => {
    // Remove @ symbol if present
    const cleanUrl = url.replace(/^@/, '');
    const match = cleanUrl.match(/twitter\.com\/\w+\/status\/(\d+)/) || 
                 cleanUrl.match(/x\.com\/\w+\/status\/(\d+)/);
    return match ? match[1] : null;
};

// Helper function to process text with formatting
const processText = (text) => {
    if (!text) return '';
    
    // First handle post number links to prevent them from being processed as greentext
    let processed = text.replace(
        /(>>\d+)/g,
        '<span class="text-blue-400 hover:text-blue-300 cursor-pointer">$1</span>'
    );
    
    // Handle bold text
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle underlined text
    processed = processed.replace(/__(.*?)__/g, '<u>$1</u>');
    
    // Handle code text
    processed = processed.replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded break-all">$1</code>');
    
    // Handle links
    processed = processed.replace(/(https?:\/\/[^\s]+)/g, (url) => {
        // Remove any trailing punctuation
        const cleanUrl = url.replace(/[.,;:!?]+$/, '');
        if (!url.includes('twitter.com') && !url.includes('x.com')) {
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline break-all">${cleanUrl}</a>`;
        }
        return cleanUrl;
    });
    
    // Process greentext (only for lines starting with > that aren't post number links)
    processed = processed.split('\n').map(line => {
        if (line.trim().startsWith('>') && !line.trim().startsWith('>>')) {
            return `<span class="text-green-500">${line}</span>`;
        }
        return line;
    }).join('\n');
    
    return processed;
};

// Global Twitter script loading
let twitterScriptPromise = null;

const loadTwitterScript = () => {
    if (!twitterScriptPromise) {
        twitterScriptPromise = new Promise((resolve, reject) => {
            if (document.querySelector('script[src="https://platform.twitter.com/widgets.js"]')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://platform.twitter.com/widgets.js';
            script.async = true;
            script.onload = () => {
                if (window.twttr && window.twttr.widgets) {
                    window.twttr.widgets.load().then(resolve).catch(reject);
                } else {
                    reject(new Error('Twitter widgets not loaded'));
                }
            };
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    return twitterScriptPromise;
};

// TwitterEmbed component
const TwitterEmbed = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tweetData, setTweetData] = useState(null);

    useEffect(() => {
        let mounted = true;

        const fetchTweetData = async () => {
            try {
                if (!mounted) return;

                // Clean the URL (remove @ if present)
                const cleanUrl = url.replace(/^@/, '');
                
                // Extract tweet ID
                const tweetId = cleanUrl.match(/status\/(\d+)/)?.[1];
                if (!tweetId) {
                    throw new Error('Invalid tweet URL');
                }

                console.log('Fetching tweet data for:', cleanUrl);

                // Fetch tweet data through our backend proxy
                const response = await fetch(`/api/twitter/embed?url=${encodeURIComponent(cleanUrl)}`, {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.details || 'Failed to fetch tweet data');
                }

                const data = await response.json();
                console.log('Received tweet data:', data);

                if (mounted) {
                    setTweetData(data);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error loading tweet:', err);
                if (mounted) {
                    setError(err.message || 'Failed to load tweet');
                    setIsLoading(false);
                }
            }
        };

        fetchTweetData();

        return () => {
            mounted = false;
        };
    }, [url]);

    if (error) {
        return (
            <div className="twitter-embed my-2">
                <div className="bg-[#1d9bf0]/10 rounded-lg border border-[#1d9bf0]/20 p-3">
                    <div className="text-red-500 mb-2">{error}</div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#1d9bf0] hover:underline">
                        View on Twitter
                    </a>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="twitter-embed my-2">
                <div className="bg-[#1d9bf0]/10 rounded-lg border border-[#1d9bf0]/20 p-3">
                    <div className="text-gray-500">Loading tweet...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="twitter-embed my-2">
            <div className="bg-[#1d9bf0]/10 rounded-lg border border-[#1d9bf0]/20 overflow-hidden">
                <div className="p-3 relative">
                    {tweetData && (
                        <div 
                            className="twitter-tweet-content"
                            dangerouslySetInnerHTML={{ __html: tweetData.html }}
                        />
                    )}
                    <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="absolute top-2 right-2 text-[#1d9bf0] hover:text-[#1a8cd8] bg-black/30 backdrop-blur-sm px-2 py-1 rounded text-sm"
                    >
                        View on Twitter
                    </a>
                </div>
            </div>
        </div>
    );
};

const PostPopup = ({ onClose, postId = null, parentCommentId = null, isComment = false, onSubmit = null, postNumber = null, boardId = null }) => {
    const [text, setText] = useState("");
    const [title, setTitle] = useState("");
    const [image, setImage] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const popupRef = useRef(null);
    const textareaRef = useRef(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [twitterPosts, setTwitterPosts] = useState([]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
        // Add post number reference if it's a reply
        if (postNumber) {
            const reference = `>>${formatPostNumber(postNumber)} `;
            setText(reference);
        }
    }, [postNumber]);

    // Handle textarea auto-resize
    const handleTextareaResize = (e) => {
        const textarea = e.target;
        textarea.style.height = '200px'; // Reset height to default
        const newHeight = Math.max(200, textarea.scrollHeight); // Minimum height of 200px
        textarea.style.height = `${newHeight}px`;
    };

    // Handle text changes with auto-resize and Twitter post detection
    const handleTextChange = (e) => {
        const newText = e.target.value;
        setText(newText);
        handleTextareaResize(e);

        // Extract Twitter post IDs
        const twitterUrls = newText.match(/(?:https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/\d+)/g) || [];
        const postIds = twitterUrls.map(url => extractTwitterPostId(url)).filter(Boolean);
        setTwitterPosts(postIds);
    };

    // Initialize textarea height on mount
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '200px';
            if (text) {
                handleTextareaResize({ target: textareaRef.current });
            }
        }
    }, []);

    // Load Twitter script once when component mounts
    useEffect(() => {
        loadTwitterScript().catch(console.error);
    }, []);

    const handleQuoteClick = (postNumber) => {
        const reference = `>>${formatPostNumber(postNumber)} `;
        setText(prev => prev + reference);
    };

    const renderPreview = () => {
        if (!text.trim()) return null;
        
        return (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                <QuoteText 
                    text={text} 
                    onQuoteClick={handleQuoteClick}
                />
            </div>
        );
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return;
        }

        // Check file size (10MB limit before compression)
        if (file.size > 10 * 1024 * 1024) {
            toast.error("Image size should be less than 10MB");
            return;
        }

        setIsUploading(true);
        try {
            const compressedImage = await compressImage(file);
            setImage(compressedImage);
        } catch (error) {
            console.error("Error compressing image:", error);
            toast.error("Error processing image");
        } finally {
            setIsUploading(false);
        }
    };

    const { mutate: createPost, isPending: isPosting } = useMutation({
        mutationFn: async () => {
            try {
                let imgBase64 = null;
                if (image) {
                    imgBase64 = image;
                }

                const endpoint = isComment ? `/api/comments/${postId}` : "/api/posts/create";
                
                const requestBody = {
                    text,
                    title,
                    img: imgBase64,
                    ...(postId && { post: postId }),
                    ...(parentCommentId && { parentComment: parentCommentId }),
                    ...(boardId && { boardId })
                };

                const res = await fetch(endpoint, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify(requestBody),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Something went wrong");
                }
                return data;
            } catch (error) {
                console.error("Error creating post/comment:", error);
                throw new Error(error.message || "Failed to create post/comment");
            }
        },
        onSuccess: (data) => {
            toast.success(isComment ? "Comment posted successfully" : "Post created successfully");
            setText("");
            setTitle("");
            setImage(null);
            onClose();
            
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            if (postId) {
                queryClient.invalidateQueries({ queryKey: ["comments", postId] });
                queryClient.invalidateQueries({ queryKey: ["post", postId] });
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create post/comment");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim() && !image) {
            toast.error("Please add some text or an image");
            return;
        }
        
        // If onSubmit prop is provided, use it (for comments)
        if (onSubmit) {
            onSubmit(text, image);
            onClose(); // Close the popup after submitting
            return;
        }
        
        // Otherwise use the mutation (for new posts)
        createPost();
    };

    const handleEmojiSelect = (emoji) => {
        setText(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    // Add formatting buttons
    const addFormatting = (type) => {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = text.substring(start, end);
        let newText = text;
        
        switch (type) {
            case 'bold':
                newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
                break;
            case 'italic':
                newText = text.substring(0, start) + `*${selectedText}*` + text.substring(end);
                break;
            case 'underline':
                newText = text.substring(0, start) + `__${selectedText}__` + text.substring(end);
                break;
            case 'code':
                newText = text.substring(0, start) + `\`${selectedText}\`` + text.substring(end);
                break;
            default:
                break;
        }
        
        setText(newText);
        // Set cursor position after the inserted formatting
        setTimeout(() => {
            textarea.focus();
            const offset = type === 'bold' ? 2 : 1;
            textarea.setSelectionRange(
                start + offset,
                end + offset
            );
        }, 0);
    };

    // Handle dragging
    const handleMouseDown = (e) => {
        if (e.target.closest('.no-drag')) return; // Don't drag if clicking on buttons or textarea
        setIsDragging(true);
        const rect = popupRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add and remove event listeners
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return createPortal(
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
            style={{ zIndex: 999999 }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <div 
                ref={popupRef}
                className="bg-[#1e1e1e]/70 backdrop-blur-md rounded-lg p-4 w-full max-w-lg mx-4 relative border border-white/10" 
                style={{
                    backgroundColor: 'rgba(30, 30, 30, 0.7)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleMouseDown}
            >
                <div className="flex justify-between items-center mb-4 cursor-grab">
                    <h3 className="text-lg font-semibold text-white">
                        {isComment ? "Add a comment" : "Create a post"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white no-drag">
                        <IoClose size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        {!isComment && (
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Post title (optional)"
                                className="w-full p-3 rounded-lg bg-[#272525]/50 backdrop-blur-sm border border-white/10 focus:border-[#1d9bf0] focus:outline-none text-white placeholder-gray-500 no-drag"
                            />
                        )}
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            placeholder={isComment ? "Write a comment..." : "What's happening?"}
                            className="w-full p-3 rounded-lg bg-[#272525]/50 backdrop-blur-sm border border-white/10 focus:border-[#1d9bf0] focus:outline-none resize-none text-white placeholder-gray-500 no-drag transition-height duration-200"
                            style={{
                                minHeight: '200px',
                                maxHeight: '60vh',
                                overflowY: 'auto'
                            }}
                        />
                        
                        {/* Formatting buttons */}
                        <div className="flex flex-wrap gap-2 mt-2 no-drag">
                            <button
                                type="button"
                                onClick={() => addFormatting('bold')}
                                className="px-2 py-1 text-sm bg-gray-700/50 rounded hover:bg-gray-600/50 font-bold text-white"
                            >
                                B
                            </button>
                            <button
                                type="button"
                                onClick={() => addFormatting('italic')}
                                className="px-2 py-1 text-sm bg-gray-700/50 rounded hover:bg-gray-600/50 italic text-white"
                            >
                                I
                            </button>
                            <button
                                type="button"
                                onClick={() => addFormatting('underline')}
                                className="px-2 py-1 text-sm bg-gray-700/50 rounded hover:bg-gray-600/50 underline text-white"
                            >
                                U
                            </button>
                            <button
                                type="button"
                                onClick={() => addFormatting('code')}
                                className="px-2 py-1 text-sm bg-gray-700/50 rounded hover:bg-gray-600/50 font-mono text-white"
                            >
                                {'</>'}
                            </button>
                        </div>
                        
                        {/* Preview section with actual colors */}
                        {text && (
                            <div className="mt-4">
                                <div className="text-sm text-gray-400 mb-2">Preview:</div>
                                {renderPreview()}
                            </div>
                        )}
                    
                    {image && (
                        <div className="relative mt-4">
                            <img
                                src={image}
                                alt="Preview"
                                className="max-h-60 rounded-lg"
                            />
                            <button
                                type="button"
                                onClick={() => setImage(null)}
                                    className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1 hover:bg-black/70 no-drag"
                            >
                                <IoClose size={20} />
                            </button>
                        </div>
                    )}

                        <div className="flex items-center justify-between mt-4 no-drag">
                        <div className="flex gap-2">
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <FaImage className="w-5 h-5 text-[#1d9bf0] hover:text-[#1a8cd8]" />
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="text-[#1d9bf0] hover:text-[#1a8cd8]"
                            >
                                <FaSmile className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg bg-gray-700/50 backdrop-blur-sm hover:bg-gray-600/50 text-white border border-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPosting || isUploading}
                                className="px-4 py-2 rounded-lg bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPosting || isUploading ? <LoadingSpinner size="sm" /> : (isComment ? "Reply" : "Post")}
                            </button>
                        </div>
                    </div>
                </form>
                </div>

                {showEmojiPicker && (
                    <div className="absolute bottom-16 left-4 no-drag">
                        <EmojiPicker onSelect={handleEmojiSelect} />
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default PostPopup; 