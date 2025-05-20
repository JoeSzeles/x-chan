
# YouTube Embed Configuration Guide

## Issues Encountered

1. Content Security Policy (CSP) blocking YouTube iframe
2. Video not loading due to missing permissions
3. Unhandled iframe loading errors

## Solution Implementation

### Content Security Policy Configuration

The following CSP configuration was required in `vite.config.js` to allow YouTube embeds:

```javascript
{
  headers: {
    'Content-Security-Policy': 
      "default-src 'self' https://*.replit.dev https://*.worf.replit.dev https://www.youtube.com; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.launchdarkly.com https://*.stripe.network " +
        "https://*.replit.dev https://replit.com https://*.worf.replit.dev https://events.launchdarkly.com " +
        "https://beacon.replit.com https://www.youtube.com; " +
      "style-src 'self' 'unsafe-inline' data: blob:; " +
      "img-src 'self' data: blob: https: https://*.cloudinary.com https://www.youtube.com; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://*.replit.dev wss://*.replit.dev wss://*.worf.replit.dev " +
        "https://*.launchdarkly.com https://*.stripe.network https://events.launchdarkly.com " +
        "https://*.cloudinary.com ws://* wss://* https://replit.com https://beacon.replit.com; " +
      "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com"
  }
}
```

Key additions:
- Added `https://www.youtube.com` to `default-src`
- Added YouTube domains to `frame-src`
- Added YouTube domains to `script-src`
- Added YouTube domains to `img-src`

### YouTubeEmbed Component Configuration

The component requires:
1. Proper error handling for iframe loading
2. Loading state management
3. Fallback for failed loads
4. URL parameter extraction for various YouTube URL formats

Key features implemented:
```jsx
- Video ID extraction from multiple URL formats
- Loading state indicator
- Error boundary with fallback to direct YouTube link
- Proper iframe attributes (allow, allowFullScreen)
- enablejsapi parameter in embed URL
```

## Common Issues and Solutions

1. **CSP Blocking**
   - Error: "Refused to load frame from 'https://www.youtube.com'"
   - Solution: Add YouTube domains to CSP frame-src directive

2. **Loading Failures**
   - Error: "Failed to load video"
   - Solution: Implement proper loading state and error handling in component

3. **Invalid URLs**
   - Error: "Could not extract video ID"
   - Solution: Robust URL parsing for multiple YouTube URL formats

## Best Practices

1. Always use HTTPS for embed URLs
2. Include loading states for better UX
3. Provide fallback to original YouTube URL
4. Handle all common YouTube URL formats
5. Use proper iframe attributes for security
6. Implement proper error boundaries

## Testing

Test the implementation with:
1. Different YouTube URL formats
2. Network issues simulation
3. Loading states
4. Error handling
5. Mobile responsiveness
