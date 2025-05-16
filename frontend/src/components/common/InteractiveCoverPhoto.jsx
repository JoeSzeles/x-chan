import React, { useState, useRef, useEffect } from 'react';

const InteractiveCoverPhoto = ({ videoUrl }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [player, setPlayer] = useState(null);
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    // Extract video ID from URL
    const getVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getVideoId(videoUrl);

    useEffect(() => {
        let isMounted = true;

        const initializeYouTubeAPI = () => {
            if (!window.YT) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                window.onYouTubeIframeAPIReady = () => {
                    if (isMounted && videoRef.current && videoId) {
                        createPlayer();
                    }
                };
            } else if (videoRef.current && videoId) {
                createPlayer();
            }
        };

        const createPlayer = () => {
            try {
                const newPlayer = new window.YT.Player(videoRef.current, {
                    videoId: videoId,
                    playerVars: {
                        autoplay: 0,
                        controls: 0,
                        modestbranding: 1,
                        rel: 0,
                        showinfo: 0,
                        mute: 0,
                        loop: 1,
                        playlist: videoId,
                        playsinline: 1
                    },
                    events: {
                        onReady: (event) => {
                            if (isMounted) {
                                setPlayer(event.target);
                            }
                        },
                        onStateChange: (event) => {
                            if (isMounted) {
                                if (event.data === window.YT.PlayerState.PLAYING) {
                                    setIsPlaying(true);
                                } else if (event.data === window.YT.PlayerState.ENDED) {
                                    event.target.playVideo();
                                }
                            }
                        },
                        onError: (event) => {
                            console.error('YouTube Player Error:', event.data);
                        }
                    }
                });
            } catch (error) {
                console.error('Error creating YouTube player:', error);
            }
        };

        initializeYouTubeAPI();

        return () => {
            isMounted = false;
            if (player) {
                try {
                    player.destroy();
                } catch (error) {
                    console.error('Error destroying player:', error);
                }
            }
        };
    }, [videoId]);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (player) {
            try {
                player.playVideo();
            } catch (error) {
                console.error('Error playing video:', error);
            }
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (player) {
            try {
                player.pauseVideo();
            } catch (error) {
                console.error('Error pausing video:', error);
            }
        }
    };

    if (!videoId) {
        return null;
    }

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-[300px] overflow-hidden rounded-lg"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div 
                ref={videoRef}
                className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                }`}
            />
            <div 
                className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-300 ${
                    isHovered ? 'opacity-0' : 'opacity-100'
                }`}
                style={{
                    backgroundImage: `url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)`
                }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className={`transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
                    <svg 
                        className="w-16 h-16 text-white drop-shadow-lg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                    >
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default InteractiveCoverPhoto; 