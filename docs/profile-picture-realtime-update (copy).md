
# Profile Picture Real-Time Update System

## Overview
The ProfilePicture component in `frontend/src/components/profile/ProfilePicture.jsx` implements a real-time update system that immediately reflects profile picture changes after upload without requiring a page refresh.

## Key Components

### 1. Cache Busting with Image Versioning
```javascript
const [imageVersion, setImageVersion] = useState(Date.now());

const getProfileImageUrl = () => {
    const baseUrl = user?.profileImg || "/avatar-placeholder.png";
    return baseUrl.includes('?') 
        ? `${baseUrl}&v=${imageVersion}` 
        : `${baseUrl}?v=${imageVersion}`;
};
```

**Purpose**: Forces the browser to reload the image by appending a timestamp parameter to the URL, bypassing browser cache.

### 2. File Upload Handler
```javascript
const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        setIsUploading(true);

        // Create FormData to send the file
        const formData = new FormData();
        formData.append('profileImg', file);

        // Upload the image
        const response = await fetch('/api/users/upload/profile', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to upload profile picture');
        }

        // Force refresh of the image by updating timestamp
        setImageVersion(Date.now());

        // Update the user data in the query cache immediately
        if (data.user) {
            queryClient.setQueryData(['authUser'], data.user);
            queryClient.setQueryData(['user', user.username], data.user);
            
            // Invalidate queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['authUser'] });
            queryClient.invalidateQueries({ queryKey: ['user', user.username] });
        }

        // Update parent component with new profile image
        if (onUpdate && data.user?.profileImg) {
            onUpdate({ type: 'image', content: data.user.profileImg });
        }

        toast.success('Profile picture updated successfully');

    } catch (error) {
        console.error('Error updating profile picture:', error);
        toast.error(error.message || 'Failed to upload profile picture');
    } finally {
        setIsUploading(false);
    }
};
```

## Real-Time Update Process

### Step 1: File Upload
1. User selects a new profile picture through the file input
2. File is wrapped in FormData and sent to `/api/users/upload/profile` endpoint
3. Loading state is activated (`setIsUploading(true)`)

### Step 2: Server Response Handling
1. Server processes the upload and returns updated user data
2. Response includes the new `profileImg` URL from Cloudinary

### Step 3: Immediate Cache Invalidation
```javascript
// Force refresh of the image by updating timestamp
setImageVersion(Date.now());
```
This immediately updates the image version, forcing the browser to reload the image with the new URL.

### Step 4: Query Cache Updates
```javascript
// Update the user data in the query cache immediately
if (data.user) {
    queryClient.setQueryData(['authUser'], data.user);
    queryClient.setQueryData(['user', user.username], data.user);
    
    // Invalidate queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['authUser'] });
    queryClient.invalidateQueries({ queryKey: ['user', user.username] });
}
```

**Purpose**: 
- Updates the React Query cache with new user data
- Invalidates related queries to ensure consistency across components
- Prevents stale data from being displayed

### Step 5: Parent Component Notification
```javascript
// Update parent component with new profile image
if (onUpdate && data.user?.profileImg) {
    onUpdate({ type: 'image', content: data.user.profileImg });
}
```

This notifies the parent component (ProfilePage) of the change, allowing it to update other UI elements if needed.

## Backend Support

### Upload Endpoint: `/api/users/upload/profile`
Located in `backend/routes/user.route.js`:

```javascript
router.post('/upload/profile', protectRoute, upload.single('profileImg'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const user = await User.findById(req.user._id);
        if (user.profileImg) {
            try {
                const publicId = user.profileImg.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.error('Error deleting old profile picture:', error);
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { profileImg: req.file.path },
            { new: true }
        ).select('-password');

        res.json({ 
            success: true, 
            user: updatedUser,
            message: 'Profile picture updated successfully' 
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ error: 'Failed to upload profile picture' });
    }
});
```

**Key Features**:
- Handles file upload via Multer + Cloudinary
- Deletes old profile picture to save storage
- Returns updated user object with new `profileImg` URL

## Visual Feedback

### Loading State
```javascript
{isUploading && (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
)}
```

Displays a spinner overlay during upload to provide user feedback.

### Hover State
```javascript
const [isHovered, setIsHovered] = useState(false);

{isMyProfile && (
    <div
        className={`absolute bottom-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => fileInputRef.current.click()}
    >
        <MdEdit className="w-5 h-5 text-white" />
    </div>
)}
```

Shows edit icon on hover to indicate the picture is clickable (only for own profile).

## Error Handling

### Client-Side
- File validation before upload
- Network error handling
- User-friendly toast notifications
- Graceful fallback to placeholder image

### Server-Side
- File type validation
- Authorization checks
- Cloudinary upload error handling
- Database update error handling

## Key Benefits

1. **Immediate Visual Feedback**: Users see their new profile picture instantly
2. **No Page Refresh Required**: Seamless user experience
3. **Cache Management**: Prevents stale images from being displayed
4. **Consistent State**: Query cache updates ensure all components show the latest data
5. **Error Recovery**: Robust error handling with user feedback

## Dependencies

- **React Query**: For cache management and data synchronization
- **React Hot Toast**: For user notifications
- **Cloudinary**: For image storage and processing
- **Multer**: For file upload handling

This system ensures that profile picture updates are reflected immediately across the entire application without requiring page refreshes or manual cache clearing.
