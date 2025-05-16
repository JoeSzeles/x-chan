# YouTube Player Implementation

This document outlines how YouTube videos are handled in posts and comments within our application.

## URL Detection

```javascript
// Helper function to detect YouTube URLs
const youtubeMatch = part.match(/(?:@)?(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+)/);
```

This regex pattern matches both formats:
- `youtube.com/watch?v=VIDEO_ID`
- `youtu.be/VIDEO_ID`

## Video ID Extraction

```javascript
const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};
```

This extracts the 11-character YouTube video ID from various URL formats.

## YouTubeEmbed Component

```javascript
const YouTubeEmbed = ({ url }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const embedContainerRef = useRef(null);

    // Loading state
    if (isLoading) {
        return (
            <div className="youtube-embed my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="flex justify-between items-center">
                        <div className="text-gray-500">Loading video...</div>
                        <button onClick={() => loadVideoData(true)}>
                            {/* Reload button */}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="youtube-embed my-2">
                <div className="bg-red-500/10 rounded-lg border border-red-500/20 p-3">
                    <div className="text-red-500">{error}</div>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        View on YouTube
                    </a>
                </div>
            </div>
        );
    }

    // Main embed
    return (
        <div className="youtube-embed my-2">
            <div className="bg-red-500/10 rounded-lg border border-red-500/20 overflow-hidden">
                {/* YouTube branding header */}
                <div className="p-3 flex items-center justify-between border-b border-red-500/20">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500">
                            {/* YouTube icon */}
                        </svg>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            View on YouTube
                        </a>
                    </div>
                </div>

                {/* Video iframe */}
                <div className="relative pt-[56.25%] w-full">
                    <iframe
                        ref={embedContainerRef}
                        className="absolute top-0 left-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&playsinline=1`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="fullscreen"
                        loading="lazy"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                </div>
            </div>
        </div>
    );
};
```

## Key Features

### Lazy Loading
- Videos only load when they come into view
- Improves initial page load performance

### Responsive Design
- 16:9 aspect ratio maintained
- Adapts to different screen sizes

### Security
- Sandboxed iframe with limited permissions
- Prevents malicious content execution

### Performance Optimizations
- `loading="lazy"` for better performance
- `modestbranding=1` for cleaner UI
- `rel=0` to prevent related videos
- `playsinline=1` for better mobile experience

## Error Handling

```javascript
onError={(e) => {
    console.error('YouTube iframe error:', e);
    setError('Failed to load video');
}}
```

## Styling

```css
.youtube-embed {
    /* Container styles */
}

.relative.pt-[56.25%] {
    /* 16:9 aspect ratio container */
}

.absolute.top-0.left-0.w-full.h-full {
    /* Full-size iframe */
}
```

## Integration in Posts/Comments

```javascript
// In the QuoteText component
const parts = text.split(/(>>\d+)/g);
return (
    <div className="whitespace-pre-wrap break-words break-all overflow-hidden">
        {parts.map((part, index) => {
            // Check for YouTube URLs
            const youtubeMatch = part.match(/(?:@)?(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+)/);
            if (youtubeMatch) {
                const videoUrl = youtubeMatch[0];
                const remainingText = part.replace(videoUrl, '').trim();
                
                return (
                    <div key={index}>
                        {remainingText && (
                            <span dangerouslySetInnerHTML={{ __html: processText(remainingText) }} />
                        )}
                        <YouTubeEmbed url={videoUrl} />
                    </div>
                );
            }
            // ... other content types
        })}
    </div>
);
```

## Performance Optimizations

1. **Lazy Loading**
   - Videos only load when scrolled into view
   - Reduces initial page load time

2. **Cleanup**
   - Proper cleanup on component unmount
   - Prevents memory leaks

3. **Error Boundaries**
   - Graceful error handling
   - User-friendly error messages

4. **Retry Mechanism**
   - Automatic retries for failed loads
   - Exponential backoff

5. **Caching**
   - Video data caching
   - Reduces server load

## Accessibility

1. **ARIA Labels**
   - Proper labeling for screen readers
   - Clear video descriptions

2. **Keyboard Navigation**
   - Full keyboard support
   - Focus management

3. **Error Messages**
   - Screen reader friendly
   - Clear error descriptions

4. **Fallback Content**
   - Alternative content when video fails
   - Direct link to YouTube

## Mobile Considerations

1. **Responsive Design**
   - Adapts to different screen sizes
   - Touch-friendly controls

2. **Performance**
   - Reduced bandwidth usage
   - Optimized for mobile networks

3. **User Experience**
   - Playsinline support
   - Mobile-friendly controls

4. **Bandwidth Management**
   - Lazy loading
   - Quality selection

## Best Practices

1. **Security**
   - Sandboxed iframe
   - Limited permissions
   - Content security policy

2. **Performance**
   - Lazy loading
   - Resource optimization
   - Caching strategy

3. **User Experience**
   - Loading states
   - Error handling
   - Fallback options

4. **Maintenance**
   - Clean code structure
   - Documentation
   - Error logging 