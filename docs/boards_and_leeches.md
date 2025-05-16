# Boards Page and Leeches System Documentation

## 1. Boards Page Overview

### 1.1 Main Components
The Boards Page (`BoardsPage.jsx`) serves as the central hub for managing and viewing boards. It includes:
- Grid/List view toggle for board display
- Create Board functionality with modal
- Board filtering (All Boards/Following Boards)
- Board cards display
- Board management tools
- Leeches section integration

### 1.2 Key Features

#### Board Management
- **View Modes**: Supports both grid and list views for board display
- **Board Creation**: Modal-based board creation with:
  - Name and description
  - Privacy settings (public, private, followers-only, list-based)
  - Image upload
  - Allowed lists configuration
- **Board Management**: Edit and delete capabilities for board owners/admins
- **Following System**: Ability to follow/unfollow boards
- **Board Statistics**: Display of followers, admins, threads, and views

#### Board Cards
Each board card displays:
- Board name and description
- Cover image (with fallback)
- Privacy status
- Action buttons (Edit/Delete for owners/admins)
- Statistics footer
- Visual elements:
  - Grid View: Large cover image background with overlay text
  - List View: Thumbnail image with horizontal layout
  - Interactive hover effects
  - Full card clickable for navigation

## 2. Leeches System

### 2.1 Overview
The Leeches system (`LeechesSection.jsx`) provides functionality to browse and interact with content from external sources (primarily 4chan). It's designed to fetch, display, and convert content from external boards into the platform's native format.

### 2.2 Key Features

#### Board Selection
- Predefined board list (e.g., /biz/, /pol/, /b/, /g/, etc.)
- Custom board input option with validation
- Board refresh functionality with 5-minute auto-refresh
- Catalog view support for different content types
- Error handling for invalid board names

#### View Options
- Multiple view modes:
  - List view: Detailed thread information with full content
  - Grid view with configurable columns (2-5 columns)
  - Responsive layout adjustments
- Thread display with:
  - Subject/title with HTML sanitization
  - Comment content with formatting
  - Image thumbnails with fallback handling
  - Reply count and image count statistics
  - Timestamp display
  - Interactive elements (hover effects, click handlers)

#### Thread Management
- Thread conversion to posts with options:
  - Personal posts (user's feed)
  - Board posts (specific board)
- Support for both personal and board reposts
- Image handling with CORS proxy
- Error handling and loading states
- Authentication checks for conversion actions

### 2.3 Technical Implementation

#### Frontend Components
- `LeechesSection.jsx`: Main component for displaying and managing leeched content
  - React Query integration for data fetching and caching
  - Real-time updates with 5-minute refresh interval
  - Error handling with toast notifications
  - State management for view modes and board selection
  - Image error handling and fallbacks
  - Authentication state management

#### Backend Services
- `leechService.js`: Core service for handling external API interactions
  - Base URLs configuration:
    - API Base: `https://a.4cdn.org`
    - Image Base: `https://i.4cdn.org`
  - Features:
    - 4chan catalog fetching with error handling
    - Thread content retrieval with timeout protection
    - Thread to post conversion with validation
    - Image URL proxying for CORS handling
    - Error handling and logging
    - HTML sanitization for comments
    - Rate limiting implementation

#### API Endpoints
- `/api/leech/4chan/{board}/{catalog}`: 
  - GET: Fetch board catalog
  - Parameters: board name, catalog type
  - Returns: Thread list with metadata
- `/api/leech/4chan/{board}/convert/{threadId}`: 
  - POST: Convert thread to post
  - Parameters: board, threadId, repostType, targetBoard
  - Authentication required
- `/api/proxy/image`: 
  - GET: Image proxy for CORS handling
  - Parameters: encoded image URL
  - Returns: Proxied image data

### 2.4 Card System Implementation

#### Thread Card Structure
The leeches system implements two main card types:

1. **Grid View Cards**
   - Layout: Vertical card with image and content
   - Components:
     - Image container with aspect ratio 16:9
     - Title with 2-line clamp
     - Comment preview with 3-line clamp
     - Statistics footer (replies, images)
   - Styling:
     - Rounded corners
     - Hover shadow effect
     - Responsive image handling
     - Fallback image support

2. **List View Cards**
   - Layout: Horizontal card with thumbnail
   - Components:
     - Thumbnail image (32x32)
     - Title and full content
     - Statistics inline
   - Styling:
     - Flexible width
     - Consistent spacing
     - Clear content hierarchy

#### Card Features
- **Interactive Elements**:
  - Click to view full thread
  - Hover effects for better UX
  - Expandable content
  - Repost functionality
  - Image error handling

- **Data Display**:
  - Thread subject/title
  - Comment content with HTML sanitization
  - Image thumbnails with CORS proxy
  - Reply and image counts
  - Timestamp display
  - Board source information

- **Responsive Design**:
  - Grid columns: 2-5 configurable
  - Auto-height adjustment
  - Mobile-friendly layouts
  - Image optimization
  - Content truncation

#### Card States
1. **Loading State**:
   - Skeleton loading
   - Centered spinner
   - Placeholder content

2. **Error State**:
   - Error message display
   - Retry option
   - Fallback content

3. **Empty State**:
   - "No threads found" message
   - Clear visual feedback
   - Optional action buttons

4. **Interactive State**:
   - Hover effects
   - Click feedback
   - Loading indicators for actions

#### Card Actions
1. **View Thread**:
   - Navigate to full thread view
   - Preserve board context
   - Handle authentication

2. **Repost Options**:
   - Personal repost
   - Board repost
   - Target board selection
   - Authentication check

3. **Image Handling**:
   - CORS proxy integration
   - Fallback images
   - Loading states
   - Error recovery

### 2.5 Security Features
- Authentication required for thread conversion
  - Token validation
  - User permission checks
- CORS protection through proxy
  - URL encoding/decoding
  - Request validation
- Rate limiting and timeout handling
  - 10-second timeout for external requests
  - Request throttling
- Input validation and sanitization
  - Board name validation
  - HTML content sanitization
  - URL encoding for parameters

### 2.6 Error Handling
- Network error recovery
- Invalid board handling
- Authentication error management
- Image loading fallbacks
- Rate limit handling
- Timeout management
- User feedback through toast notifications

### 2.7 Data Processing
- Thread data transformation
- Image URL processing
- HTML content sanitization
- Timestamp conversion
- Statistics calculation
- Cache management

## 3. Integration Points

### 3.1 Board-Leech Integration
- Leeches section appears at the bottom of the boards page
- Shared styling and UI components
- Consistent error handling and loading states
- Unified user experience

### 3.2 Data Flow
1. User selects board/catalog
2. Frontend requests data through API
3. Backend fetches from external source
4. Data processed and returned to frontend
5. UI updates with new content
6. User can interact with content (view/convert)

## 4. Future Improvements
- Enhanced error recovery
- Additional external source support
- Improved image handling
- Advanced filtering options
- Better mobile responsiveness
- Performance optimizations 