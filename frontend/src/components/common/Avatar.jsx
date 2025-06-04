import React from 'react';
import { Link } from 'react-router-dom';
import { FaCircle } from 'react-icons/fa';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const Avatar = ({ 
  user, 
  size = 'md', 
  showOnlineStatus = false, 
  className = '', 
  onClick,
  showLink = true 
}) => {
  const { isUserOnline } = useOnlineStatus();

  if (!user) {
    return null;
  }

  const sizeClasses = {
    xxs: 'w-4 h-4',
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const avatarElement = (
    <div className={`relative inline-block ${className}`}>
      <img
        src={user.profileImg || "/avatar-placeholder.png"}
        alt={`${user.fullName || user.username}'s avatar`}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer`}
        onClick={onClick}
      />
      {showOnlineStatus && (
        <div className="absolute -bottom-1 -right-1">
          <FaCircle 
            className={`text-xs ${
              isUserOnline(user._id) ? 'text-green-500' : 'text-gray-400'
            }`}
            size={12}
          />
        </div>
      )}
    </div>
  );

  if (!showLink || onClick) {
    return avatarElement;
  }

  return (
    <Link to={`/profile/${user.username}`}>
      {avatarElement}
    </Link>
  );
};

export default Avatar;