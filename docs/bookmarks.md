# Bookmarks Page Documentation

## Overview
The Bookmarks page is a feature that allows users to save and organize posts they want to reference later. It provides both a list view and a grid view of bookmarked posts, with various interactive features.

## Page Structure

### Layout Components
1. **Header Section**
   - Back button to return to previous page
   - Page title "Bookmarks"
   - View toggle buttons (List/Grid view)

2. **Content Area**
   - Loading spinner while fetching bookmarks
   - Empty state message when no bookmarks exist
   - Grid/List view of bookmarked posts

### View Modes
1. **List View**
   - Traditional vertical layout
   - Full post display with all interactions
   - Posts stacked vertically

2. **Grid View**
   - Compact card layout
   - 4-column grid on large screens
   - Responsive design for different screen sizes
   - Hover effects for better interaction

## Bookmark Card Implementation

### Card Structure
1. **Header Section**
   - User profile picture (small circular image)
   - Username
   - Post title
   - Bookmark icon (top-right corner)
   - Post number (formatted as "No.000000000")

2. **Content Section**
   - Post text (truncated to 2 lines)
   - Media content:
     - Images: Displayed at 300x150px
     - YouTube videos: Shows video thumbnail
     - Other videos: Shows video thumbnail

3. **Footer Section**
   - "View Thread" button
   - Positioned over the media content
   - Semi-transparent background for visibility

### Interactive Features

1. **Bookmark Toggle**
   ```javascript
   const handleBookmark = () => {
     if (isBookmarking) return;
     toggleBookmark();
   };
   ```
   - Located in top-right corner
   - Toggles bookmark status
   - Updates UI immediately
   - Removes post from bookmarks list when unbookmarked

2. **Post Number Interaction**
   - Hover effect shows post preview
   - Click navigates to full post
   - Formatted as "No.000000000"
   - Monospace font for better readability

3. **Media Handling**
   - Images:
     ```javascript
     <img
       src={post.img}
       className="h-[150px] w-[300px] object-cover rounded-lg"
       alt=""
     />
     ```
   - YouTube Videos:
     ```javascript
     const getYouTubeThumbnail = (url) => {
       const videoId = url.split('v=')[1] || url.split('/').pop();
       return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
     };
     ```

4. **View Thread Button**
   - Absolute positioned over media
   - Semi-transparent background
   - Hover effect
   - Navigates to full post view

### State Management

1. **View Mode State**
   ```javascript
   const [viewMode, setViewMode] = useState("list");
   ```

2. **Bookmark Data**
   ```javascript
   const { data: bookmarks, isLoading } = useQuery({
     queryKey: ["bookmarks"],
     queryFn: async () => {
       const res = await fetch("/api/bookmarks");
       const data = await res.json();
       return data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
     },
   });
   ```

3. **Bookmark Interaction State**
   ```javascript
   const [localBookmarks, setLocalBookmarks] = useState(post.bookmarkedBy || []);
   const isBookmarked = localBookmarks?.includes(authUser?._id);
   ```

### Styling

1. **Card Container**
   ```css
   className="flex gap-2 items-start p-0 rounded-lg hover:bg-[#2a2a2a] transition-colors"
   ```

2. **Grid Layout**
   ```css
   className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4"
   ```

3. **Media Container**
   ```css
   className="relative h-[150px] w-[300px]"
   ```

### Error Handling

1. **Image Loading**
   ```javascript
   onError={(e) => {
     e.target.src = "/avatar-placeholder.png";
   }}
   ```

2. **Video Thumbnail**
   ```javascript
   onError={(e) => {
     e.target.src = "/avatar-placeholder.png";
   }}
   ```

## Data Flow

1. **Initial Load**
   - Fetches bookmarked posts from API
   - Sorts by creation date (newest first)
   - Populates grid/list view

2. **Bookmark Toggle**
   - Updates local state
   - Sends API request
   - Updates cache
   - Removes from view if unbookmarked

3. **View Mode Change**
   - Updates viewMode state
   - Re-renders with new layout
   - Maintains all functionality

## Performance Considerations

1. **Image Optimization**
   - Fixed dimensions for thumbnails
   - Object-cover for consistent display
   - Fallback images for failed loads

2. **Lazy Loading**
   - Images load as needed
   - Thumbnails only when in viewport
   - Efficient grid rendering

3. **State Updates**
   - Optimistic updates for better UX
   - Cache invalidation on changes
   - Efficient re-rendering

## Accessibility

1. **Keyboard Navigation**
   - Focusable elements
   - Clear focus states
   - Logical tab order

2. **Screen Reader Support**
   - Alt text for images
   - ARIA labels where needed
   - Semantic HTML structure

## Future Improvements

1. **Potential Enhancements**
   - Bookmark categories/folders
   - Search within bookmarks
   - Sort options
   - Bulk actions

2. **Performance Optimizations**
   - Virtual scrolling for large lists
   - Image preloading
   - Cached thumbnails

3. **UX Improvements**
   - Drag and drop reordering
   - Custom grid layouts
   - Bookmark notes/tags 