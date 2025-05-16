# Twitter Cards Implementation

## Overview
This document details how Twitter cards (tweet embeds) are implemented in the website. The implementation includes loading tweets, handling media, and ensuring proper display of tweet content.

## Components

### 1. TwitterEmbed Component
The main component responsible for rendering Twitter cards is `TwitterEmbed`, located in `frontend/src/components/common/QuoteText.jsx`.

#### Key Features:
- Handles tweet loading and error states
- Manages Twitter script loading
- Renders tweet content and media
- Provides reload functionality
- Maintains consistent styling with Twitter's design

## Implementation Details

### Twitter Script Loading
```javascript
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
```

### Tweet Data Fetching
The component fetches tweet data through a backend proxy endpoint:
```javascript
const response = await fetch(`/api/twitter/embed?url=${encodeURIComponent(cleanUrl)}`, {
    credentials: 'include',
    headers: {
        'Accept': 'application/json'
    }
});
```

### Component States
1. **Loading State**
   - Shows a loading indicator
   - Displays a reload button
   - Uses Twitter's brand colors

2. **Error State**
   - Shows error message
   - Provides a reload button
   - Includes a link to view the tweet on Twitter

3. **Success State**
   - Displays tweet content
   - Shows media if present
   - Includes author information
   - Maintains Twitter's styling

### Media Handling
The component handles different types of media:
- Images
- Videos
- GIFs
- Multiple media items in a grid layout

### Styling
The component uses Tailwind CSS classes to maintain Twitter's design:
- Twitter blue color scheme (`#1d9bf0`)
- Rounded corners
- Proper spacing and padding
- Responsive design
- Hover effects

## Usage

### Basic Implementation
```jsx
<TwitterEmbed url="https://twitter.com/username/status/123456789" />
```

### Integration with QuoteText
The `TwitterEmbed` component is used within the `QuoteText` component to handle tweet URLs in posts and comments.

## Error Handling
- Network errors
- Invalid tweet URLs
- Failed media loading
- Twitter script loading failures

## Performance Considerations
1. **Script Loading**
   - Twitter script is loaded only once
   - Uses a promise to prevent multiple loads
   - Handles script loading errors

2. **Media Loading**
   - Lazy loading for images
   - Error handling for failed media
   - Proper cleanup on unmount

3. **State Management**
   - Proper cleanup of mounted state
   - Error state handling
   - Loading state management

## Security
- Uses backend proxy to fetch tweet data
- Includes proper CORS headers
- Sanitizes tweet HTML content
- Handles user credentials properly

## Best Practices
1. **Error Recovery**
   - Provides reload functionality
   - Clear error messages
   - Fallback to Twitter.com link

2. **User Experience**
   - Loading indicators
   - Smooth transitions
   - Consistent styling
   - Responsive design

3. **Code Organization**
   - Clean component structure
   - Proper state management
   - Clear error handling
   - Reusable utilities

## Limitations
1. Requires Twitter's widget script
2. Dependent on Twitter's API availability
3. May have loading delays
4. Requires backend proxy for CORS

## Future Improvements
1. Implement caching for tweet data
2. Add support for tweet threads
3. Improve media loading performance
4. Add more customization options

## Dependencies
- React
- Twitter Widgets API
- Backend proxy API
- Tailwind CSS

## Related Components
- `QuoteText`: Parent component
- `PostPopup`: Editor implementation
- Backend proxy endpoints

## API Endpoints
- `/api/twitter/embed`: Fetches tweet data
- Twitter Widgets API: Renders tweet content

## Testing
1. Test with various tweet types
2. Verify media loading
3. Check error handling
4. Test reload functionality
5. Verify styling consistency

## Troubleshooting
1. Check Twitter script loading
2. Verify API responses
3. Check media loading
4. Verify error states
5. Test reload functionality 