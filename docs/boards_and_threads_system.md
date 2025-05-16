# Boards and Threads System Documentation

## 1. Boards Page Overview

### 1.1 Main Components
The Boards Page (`BoardsPage.jsx`) is a central hub for managing and viewing boards. It includes:
- Grid/List view toggle
- Create Board functionality
- Board filtering (All Boards/Following Boards)
- Board cards display
- Board management tools

### 1.2 Key Features
- **View Modes**: Supports both grid and list views for board display
- **Board Creation**: Modal-based board creation with:
  - Name and description
  - Privacy settings
  - Image upload
  - Allowed lists configuration
- **Board Management**: Edit and delete capabilities for board owners/admins
- **Following System**: Ability to follow/unfollow boards
- **Board Statistics**: Display of followers, admins, threads, and views

## 2. Board Cards

### 2.1 Card Structure
Each board card displays:
- Board name and description
- Cover image (with fallback)
- Privacy status
- Action buttons (Edit/Delete for owners/admins)
- Statistics footer

### 2.2 Visual Elements
- **Grid View**:
  - Large cover image background
  - Overlay text for better readability
  - Hover effects with shadow
  - Full card clickable for navigation

- **List View**:
  - Thumbnail image
  - Horizontal layout
  - Compact information display
  - Same hover effects and interactivity

### 2.3 Interactive Features
- Click to navigate to board
- Hover effects for better UX
- Quick action buttons
- Statistics tooltips
- Follow/Unfollow functionality

## 3. Thread System

### 3.1 Thread View Component
The Thread View system (`ThreadView.jsx`) provides a sophisticated comment threading system with:

#### Core Features
- Original post display
- Nested comment structure
- Visual thread connectors
- Breadcrumb navigation
- Reply management
- View count tracking

### 3.2 Thread Connector System
The `ThreadConnector` component creates visual connections between comments using:
- SVG-based curved lines
- Dynamic positioning
- Level-based indentation
- Hover effects
- Visual hierarchy indicators

### 3.3 Comment Threading
- **ThreadedComment Component**:
  - Handles individual comment display
  - Manages reply relationships
  - Tracks view counts
  - Provides reply functionality
  - Visual threading indicators

### 3.4 Navigation Features
- Deep linking to specific comments
- Breadcrumb navigation
- Thread path tracking
- Quote reference system
- Back navigation with scroll position preservation

### 3.5 Interactive Elements
- Reply buttons
- View more replies
- Like/Unlike functionality
- Repost capability
- Bookmark system
- Share functionality

## 4. Technical Implementation

### 4.1 State Management
- React Query for data fetching and caching
- Local state for UI interactions
- Optimistic updates for better UX
- View count tracking
- Navigation state preservation

### 4.2 Performance Optimizations
- Memoized components
- Efficient re-rendering
- Optimistic updates
- Proper cache management
- Lazy loading of images

### 4.3 Error Handling
- Graceful fallbacks
- Loading states
- Error boundaries
- User feedback
- Network error handling

### 4.4 Accessibility
- Semantic HTML structure
- ARIA attributes
- Keyboard navigation
- Screen reader support
- Focus management

## 5. Best Practices

### 5.1 Code Organization
- Modular component structure
- Clear separation of concerns
- Reusable components
- Consistent naming conventions
- Proper documentation

### 5.2 User Experience
- Clear navigation
- Responsive design
- Loading states
- Error handling
- Consistent styling

### 5.3 Performance
- Efficient data fetching
- Optimized rendering
- Proper caching
- Image optimization
- State management

### 5.4 Security
- Authentication checks
- Authorization rules
- Input validation
- XSS prevention
- CSRF protection 