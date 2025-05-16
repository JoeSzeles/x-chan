# Grid System Template

This document outlines the implementation of a responsive grid system for displaying posts in both list and grid views. This template can be used across different pages that need to display posts in a grid format.

## Implementation

### 1. Component Structure

```jsx
const PageComponent = () => {
    const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
    const [selectedPost, setSelectedPost] = useState(null);

    // ... other state and data fetching logic ...

    return (
        <div className='flex-[4_4_0] border-r border-gray-700 min-h-screen'>
            {/* Header with View Toggle */}
            <div className='flex justify-between items-center px-4 py-2 border-b border-gray-700'>
                {/* ... header content ... */}
                <div className='flex gap-2'>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                            viewMode === "list" ? "text-blue-500" : "text-gray-500"
                        }`}
                        title="List View"
                    >
                        <FaList className='w-4 h-4' />
                    </button>
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-full hover:bg-gray-700 transition-colors ${
                            viewMode === "grid" ? "text-blue-500" : "text-gray-500"
                        }`}
                        title="Grid View"
                    >
                        <FaTh className='w-4 h-4' />
                    </button>
                </div>
            </div>

            {/* Posts Grid/List Container */}
            <div className={viewMode === "grid" ? "grid grid-cols-4 gap-2 p-2" : ""}>
                {posts.map((post) => (
                    <div 
                        key={post._id} 
                        className={viewMode === "grid" ? `relative bg-[#1e1e1e] rounded-lg overflow-hidden hover:bg-[#2a2a2a] transition-colors cursor-pointer h-[200px]` : ""}
                        onClick={() => viewMode === "grid" && handlePostClick(post)}
                    >
                        <Post 
                            post={post} 
                            isCompact={viewMode === "grid"}
                        />
                    </div>
                ))}
            </div>

            {/* Post Modal */}
            {selectedPost && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={handleClosePost}
                >
                    <div 
                        className="bg-[#1e1e1e] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleClosePost}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
                            aria-label="Close modal"
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-6 w-6" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M6 18L18 6M6 6l12 12" 
                                />
                            </svg>
                        </button>
                        <div className="p-4">
                            <Post post={selectedPost} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
```

## Key Features

### 1. View Mode Toggle
- Toggle between list and grid views
- Uses state to track current view mode
- Styled buttons with active state indication

### 2. Grid Layout
- Responsive 4-column grid using CSS Grid
- Fixed height cards (200px) for consistent appearance
- Proper spacing with gap-2
- Hover effects for better interactivity

### 3. Card Styling
```css
.relative              /* For proper positioning context */
.bg-[#1e1e1e]         /* Dark background */
.rounded-lg           /* Rounded corners */
.overflow-hidden      /* Contain content */
.hover:bg-[#2a2a2a]   /* Hover effect */
.transition-colors    /* Smooth transitions */
.cursor-pointer       /* Indicate clickable */
.h-[200px]           /* Fixed height */
```

### 4. Modal Implementation
- Full-screen overlay with semi-transparent background
- Centered modal with max width and height constraints
- Close button in top-right corner
- Click outside to close
- Proper event propagation handling

## Usage

To implement this grid system in a new page:

1. Copy the basic structure
2. Implement the necessary state management
3. Add your data fetching logic
4. Customize the styling as needed
5. Ensure the Post component is properly imported and configured

## Dependencies

- React Icons (FaList, FaTh)
- Post component with isCompact prop support
- Tailwind CSS for styling

## Notes

- The grid system is optimized for dark theme
- Card height can be adjusted by modifying the h-[200px] class
- Grid columns can be adjusted by modifying the grid-cols-4 class
- Ensure proper z-index management for overlays and modals 