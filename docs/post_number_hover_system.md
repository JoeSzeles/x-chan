# Post Number Hover System Documentation

## Overview
The Post Number Hover System provides an interactive way to preview posts and comments when hovering over post numbers (e.g., >>001). It includes a popup card that shows the referenced content, user information, and any associated media.

## Components

### 1. PostNumberLink Component
**Location**: `frontend/src/components/common/PostNumberLink.jsx`

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const PostNumberLink = ({ postNumber, className = "" }) => {
    const [showPreview, setShowPreview] = useState(false);
    const navigate = useNavigate();

    const { data: post, isLoading } = useQuery({
        queryKey: ['post', postNumber],
        queryFn: async () => {
            const response = await axios.get(`/api/posts/number/${postNumber}`);
            return response.data;
        },
        enabled: showPreview
    });

    const handleClick = () => {
        if (post) {
            // If it's a comment, navigate to its parent post's thread
            if (post.post) {
                navigate(`/thread/${post.post}`);
            } else {
                navigate(`/thread/${post._id}`);
            }
        }
    };

    const handleMouseEnter = () => {
        setShowPreview(true);
    };

    const handleMouseLeave = () => {
        setShowPreview(false);
    };

    return (
        <div className="relative inline-block">
            <span
                className={`text-blue-400 hover:text-blue-300 cursor-pointer ${className}`}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {`>>${postNumber.toString().padStart(3, '0')}`}
            </span>
            
            {showPreview && !isLoading && post && (
                <div className="fixed z-[9999] transform -translate-x-1/2 left-1/2 mt-2 w-64 bg-[#1e1e1e] rounded-lg shadow-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                        <img
                            src={post.user.profileImg || '/default-avatar.png'}
                            alt={post.user.username}
                            className="w-8 h-8 rounded-full"
                        />
                        <div>
                            <p className="font-semibold text-sm">{post.user.username}</p>
                            <p className="text-xs text-gray-400">No.{post.postNumber.toString().padStart(3, '0')}</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-200 line-clamp-3">{post.text}</p>
                    {post.img && (
                        <img
                            src={post.img}
                            alt="Post preview"
                            className="mt-2 rounded-lg max-h-32 object-cover"
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default PostNumberLink;
```

### 2. Backend API Endpoint
**Location**: `backend/controllers/post.controller.js`

```javascript
export const getPostByNumber = async (req, res, next) => {
    try {
        const { postNumber } = req.params;
        
        // First try to find in posts
        let post = await Post.findOne({ postNumber })
            .populate("user", "username fullName profileImg");

        // If not found in posts, try in comments
        if (!post) {
            post = await Comment.findOne({ postNumber })
                .populate("user", "username fullName profileImg")
                .populate("post", "_id"); // Populate the parent post reference
        }

        if (!post) {
            return next(errorHandler(404, "Post not found"));
        }

        res.status(200).json(post);
    } catch (error) {
        next(error);
    }
};
```

## Implementation Details

### 1. State Management
- Uses React's `useState` for controlling popup visibility
- Uses React Query for data fetching and caching
- Only fetches data when hover is active

### 2. Styling
```css
/* Key CSS classes */
.fixed          /* Position relative to viewport */
.z-[9999]       /* Ensure popup is above other elements */
.transform      /* Enable transform properties */
.-translate-x-1/2  /* Center horizontally */
.left-1/2       /* Position from left edge */
.mt-2           /* Margin top for spacing */
.w-64           /* Width of popup */
.bg-[#1e1e1e]   /* Dark background */
.rounded-lg     /* Rounded corners */
.shadow-lg      /* Large shadow */
.border         /* Border */
.border-gray-700 /* Border color */
```

### 3. Data Flow
1. User hovers over post number
2. `handleMouseEnter` triggers
3. `showPreview` state becomes true
4. React Query fetches post data
5. Popup renders with post data
6. On mouse leave:
   - `handleMouseLeave` triggers
   - `showPreview` becomes false
   - Popup disappears

### 4. Performance Optimizations
- Data is only fetched when hover is active
- React Query caches the data
- Loading state prevents flickering
- Conditional image rendering

### 5. Navigation
- Clicking a post number navigates to the thread
- For comments, navigates to parent post's thread
- Uses React Router for navigation

## Usage Example

```javascript
// In a component that displays post numbers
import PostNumberLink from './PostNumberLink';

const PostContent = ({ text }) => {
    const parts = text.split(/(>>\d+)/g);
    return (
        <>
            {parts.map((part, index) => {
                if (part.match(/>>\d+/)) {
                    const number = parseInt(part.substring(2), 10);
                    return (
                        <PostNumberLink
                            key={index}
                            postNumber={number}
                        />
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </>
    );
};
```

## Dependencies
- React
- React Router
- React Query
- Axios
- Tailwind CSS

## Best Practices
1. Always pad post numbers to 3 digits
2. Handle both posts and comments
3. Show loading states
4. Cache data for better performance
5. Ensure proper z-indexing
6. Handle image loading gracefully
7. Provide fallback for missing data

## Future Improvements
1. Add animation for smoother transitions
2. Implement touch support for mobile
3. Add keyboard navigation
4. Cache images for faster loading
5. Add error boundaries
6. Implement retry logic for failed fetches
7. Add analytics tracking 