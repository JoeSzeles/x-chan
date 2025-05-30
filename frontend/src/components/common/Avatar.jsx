
import React from 'react';
import { Link } from 'react-router-dom';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const Avatar = ({ 
  user, 
  size = 'md', 
  showOnlineStatus = true, 
  className = '', 
  isClickable = true,
  ...props 
}) => {
  const { isUserOnline } = useOnlineStatus();
  const isOnline = showOnlineStatus && user?._id && isUserOnline(user._id);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    xxl: 'w-20 h-20'
  };

  const onlineIndicatorSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    xxl: 'w-4 h-4'
  };

  const avatarContent = (
    <div className={`relative ${className}`} {...props}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gray-600 hover:border-gray-500 transition-colors bg-gray-800`}>
        <img
          src={user?.profileImg || "/avatar-placeholder.png"}
          alt={user?.fullName || user?.username || 'User'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = "/avatar-placeholder.png";
          }}
        />
      </div>
      
      {/* Online status indicator */}
      {isOnline && (
        <div 
          className={`absolute bottom-0 right-0 ${onlineIndicatorSizes[size]} bg-green-500 rounded-full border-2 border-gray-800`}
          style={{ 
            filter: 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.5))'
          }}
        />
      )}
    </div>
  );

  if (!isClickable || !user?.username) {
    return avatarContent;
  }

  return (
    <Link to={`/profile/${user.username}`} className="block">
      {avatarContent}
    </Link>
  );
};

export default Avatar;
