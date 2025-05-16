# Thread View System Documentation

## Overview
The Thread View system is a sophisticated component that handles the display and interaction of nested comments and replies in a hierarchical structure. It provides a visual representation of comment threads with proper indentation, connecting lines, and interactive features.

## Main Components

### 1. ThreadView Component
**Location**: `frontend/src/components/common/ThreadView.jsx`

#### Core Features
- Displays the original post and its comment thread
- Handles comment navigation and focus
- Manages reply interactions
- Tracks view counts
- Provides breadcrumb navigation

#### Structure
1. **Original Post Section**
   - Post content display
   - User information
   - Action buttons
   - Star rating

2. **Breadcrumb Navigation**
   - Shows comment path hierarchy
   - Interactive navigation links
   - Thread depth indicator
   - Profile picture previews

3. **Comments Section**
   - Root level comments
   - Nested replies
   - Visual connectors
   - Reply counts

4. **Reply Section**
   - Focused comment view
   - Direct replies
   - Reply input
   - Empty state handling

### 2. ThreadedComment Component
**Location**: `frontend/src/components/common/ThreadView.jsx`

#### Features
- Handles individual comment display
- Manages visual threading
- Tracks view counts
- Handles reply interactions

#### Structure
1. **Visual Elements**
   - Comment content
   - Profile picture
   - User information
   - Action buttons
   - Connector lines

2. **Threading Indicators**
   - Indentation based on nesting level
   - Vertical connector lines
   - Visual hierarchy markers

3. **Interactive Elements**
   - Reply button
   - View replies button
   - Like/Unlike functionality
   - Repost capability

## Thread Navigation System

### 1. Path Tracking
```javascript
const findCommentPath = (commentList, targetId, path = []) => {
    // Recursively finds the path to a specific comment
    // Returns array of comments from root to target
}
```

### 2. Focus Management
- Root view (all comments)
- Focused view (single comment and its replies)
- Breadcrumb navigation
- Back navigation

### 3. URL Structure
- `/post/:postId` - Root view
- `/post/:postId/comment/:commentId` - Focused comment view

## Visual Hierarchy

### 1. Indentation System
- Base indentation: 40px per level
- Visual connectors between levels
- Proper spacing for readability

### 2. Connector Lines
- Vertical lines showing thread relationships
- Horizontal lines for reply indicators
- Visual hierarchy markers

### 3. Profile Picture Grid
- Horizontal grid of reply authors
- Hover tooltips with usernames
- Quick navigation to specific replies

## State Management

### 1. Data Structure
```javascript
{
    post: {
        _id: string,
        user: object,
        text: string,
        img: string,
        comments: array,
        // ... other post data
    },
    comments: [
        {
            _id: string,
            user: object,
            text: string,
            replies: array,
            parentComment: string,
            // ... other comment data
        }
    ],
    focusedComment: string,
    commentPath: array
}
```

### 2. View Count Tracking
- Automatic view count updates
- Optimistic UI updates
- Cache management with React Query

### 3. Reply Management
- Nested reply support
- Reply depth tracking
- Reply count updates

## Interactive Features

### 1. Navigation
- Click to focus on specific comments
- Breadcrumb navigation
- Back to root view
- Quick jump to replies

### 2. Reply System
- Reply to original post
- Reply to specific comments
- Nested reply support
- Reply count tracking

### 3. Action Buttons
- Like/Unlike
- Repost
- View count
- Star rating
- Bookmark

## Implementation Details

### 1. Performance Optimizations
- Memoized components
- Efficient re-rendering
- Optimistic updates
- Proper cache management

### 2. Error Handling
- Graceful fallbacks
- Loading states
- Error boundaries
- User feedback

### 3. Accessibility
- Semantic HTML structure
- ARIA attributes
- Keyboard navigation
- Screen reader support

## Usage Example

```javascript
// Basic implementation
<ThreadView 
    postId={postId}
    commentId={commentId} // Optional, for focused view
/>

// With custom handlers
<ThreadView 
    postId={postId}
    commentId={commentId}
    onCommentClick={handleCommentClick}
    onReplySubmit={handleReplySubmit}
    onBackClick={handleBackClick}
/>
```

## Best Practices

1. **Performance**
   - Use proper memoization
   - Implement efficient re-rendering
   - Optimize image loading
   - Manage cache effectively

2. **User Experience**
   - Provide clear navigation
   - Show loading states
   - Handle errors gracefully
   - Maintain consistent styling

3. **Code Organization**
   - Keep components modular
   - Use proper prop types
   - Implement error boundaries
   - Document complex logic

4. **Maintenance**
   - Regular performance monitoring
   - Update dependencies
   - Maintain documentation
   - Follow coding standards 