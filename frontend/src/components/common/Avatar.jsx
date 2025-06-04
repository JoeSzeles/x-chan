
import React from 'react';
import { Link } from 'react-router-dom';
import { FaCircle } from 'react-icons/fa';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const Avatar = ({ 
  user, 
  size = 'md', 
  showOnlineStatus = true, 
  className = '', 
  clickable = true,
  showBorder = true
}) => {
  const { isUserOnline } = useOnlineStatus();
  
  if (!user) return null;
  
  const isOnline = showOnlineStatus && isUserOnline(user._id);
  
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    xxl: 'w-20 h-20'
  };
  
  const avatarSize = sizeClasses[size] || sizeClasses.md;
  
  const avatarContent = (
    <div className={`relative ${avatarSize} ${className}`}>
      <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${
        showBorder ? 'border-2 border-gray-700 hover:border-gray-500' : ''
      } transition-colors duration-200`}>
        <img 
          src={user.profileImg || "/avatar-placeholder.png"} 
          className="w-full h-full object-cover" 
          alt={user.fullName || user.username}
          onError={(e) => {
            e.target.src = "/avatar-placeholder.png";
          }}
        />
      </div>
      {isOnline && (
        <FaCircle 
          className="absolute bottom-0 right-0 text-green-500 text-xs" 
          style={{ 
            filter: 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.5))',
            fontSize: size === 'xs' || size === 'sm' ? '8px' : '12px'
          }}
        />
      )}
    </div>
  );
  
  if (!clickable) {
    return avatarContent;
  }
  
  return (
    <Link 
      to={`/profile/${user.username}`}
      className="inline-block"
    >
      {avatarContent}
    </Link>
  );
};

export default Avatar;
