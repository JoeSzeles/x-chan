# Card Components Documentation

## Overview
This document outlines the structure and features of the three main card components in our social media platform: Post Card, Comment Card, and Reply Card. Each component is designed to be modular, reusable, and consistent in their appearance and functionality.

## Post Card Component
**Location**: `frontend/src/components/common/Post.jsx`

### Structure
1. **Main Container**
   - Flex layout with gap spacing
   - Hover effects with shadow
   - Border bottom for separation
   - Post Number Header at the top

2. **Profile Section**
   - User avatar with hover effect
   - Link to user profile
   - Username and full name display

3. **Content Section**
   - Post text with show more/less functionality
   - Image support with proper sizing
   - Post number and timestamp display
   - Anonymous ID support

4. **Action Bar**
   - Like button with counter
   - Comment button with counter
   - Repost button with counter
   - Bookmark button
   - Share button
   - View count
   - Delete button (for post owners)

### Features
- Real-time updates for likes and comments
- Image support with proper aspect ratio
- Delete functionality for post owners
- Post number system integration
- Anonymous posting support

## Comment Card Component
**Location**: `frontend/src/components/common/Comment.jsx`

### Structure
1. **Main Container**
   - Similar to Post Card
   - Indentation based on nesting level
   - Post Number Header for identification

2. **Profile Section**
   - User avatar
   - Username and full name
   - Reply-to indicator

3. **Content Section**
   - Comment text
   - Image support
   - Comment number display
   - Timestamp

4. **Action Bar**
   - Reply button
   - Like button
   - Repost button
   - Rating button
   - Delete button (for comment owners)

### Features
- Nested reply support
- View count tracking
- Delete functionality for comment owners
- Post number system integration
- Anonymous commenting support

## Reply Card Component
**Location**: Integrated within `Comment.jsx` and `ThreadView.jsx`

### Structure
1. **Main Container**
   - Inherits Comment Card structure
   - Visual indicators for threading
   - Post Number Header for identification

2. **Profile Section**
   - User avatar
   - Username and full name
   - Reply-to indicator

3. **Content Section**
   - Reply text
   - Image support
   - Reply number display
   - Timestamp

4. **Action Bar**
   - Reply button
   - Like button
   - Repost button
   - Rating button
   - Delete button (for reply owners)

### Features
- Nested reply support
- Visual threading indicators
- Delete functionality for reply owners
- Post number system integration
- Anonymous reply support

## Post Number System
**Location**: `frontend/src/components/common/PostNumberHeader.jsx`

### Features
1. **Number Format**
   - Unique post numbers
   - Sequential numbering
   - Format: "No.XXXXX"

2. **User Identification**
   - User ID display
   - Anonymous ID support
   - Format: "ID:XXXXX" or "Anonymous"

3. **Timestamp**
   - 4chan-style date format
   - Time display
   - Format: "MM/DD/YY(Day)HH:mm:ss"

### Integration
- Added to all card components
- Consistent styling across components
- Proper spacing and alignment
- Hover effects for better UX

## Common Features Across All Cards
1. **State Management**
   - React Query for data fetching
   - Local state for UI interactions
   - Optimistic updates

2. **Interactive Elements**
   - Hover effects
   - Click animations
   - Loading states

3. **Styling**
   - Consistent dark theme
   - Tailwind CSS classes
   - Responsive design

4. **Security**
   - Owner-only actions
   - Proper authorization checks
   - Safe content rendering

## Implementation Notes
1. **Modularity**
   - Each component is self-contained
   - Shared utilities for common functions
   - Consistent prop interfaces

2. **Performance**
   - Lazy loading for images
   - Memoization for expensive computations
   - Efficient re-rendering

3. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

4. **Error Handling**
   - Graceful fallbacks
   - Error boundaries
   - User-friendly messages

## Best Practices
1. **Code Organization**
   - Separate concerns
   - Clear component hierarchy
   - Consistent naming

2. **State Management**
   - Minimal local state
   - Proper data flow
   - Efficient updates

3. **Styling**
   - Consistent class names
   - Responsive design
   - Dark theme support

4. **Testing**
   - Unit tests for components
   - Integration tests for features
   - Accessibility testing

## Maintenance
1. **Updates**
   - Regular dependency updates
   - Performance monitoring
   - Security patches

2. **Documentation**
   - Clear component documentation
   - Usage examples
   - API references

3. **Code Quality**
   - Linting rules
   - Code reviews
   - Performance audits 