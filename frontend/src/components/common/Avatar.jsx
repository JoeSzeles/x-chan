
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCircle, FaEnvelope, FaUser } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

const Avatar = ({ 
  user, 
  size = 'md', 
  showOnlineStatus = true, 
  className = '', 
  clickable = true,
  showBorder = true,
  showMessageIcon = true
}) => {
  const { data: authUser } = useQuery({ queryKey: ["authUser"] });
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const { data: onlineUsers } = useQuery({
    queryKey: ["onlineUsers"],
    queryFn: async () => {
      const res = await fetch('/api/users/online');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch online users");
      return data;
    },
    enabled: !!authUser && showOnlineStatus,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  if (!user) return null;
  
  const isOnline = showOnlineStatus && onlineUsers?.some(onlineUser => onlineUser._id === user._id);
  
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    xxl: 'w-20 h-20'
  };

  const handleStartConversation = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch('/api/messages/start-conversation', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId: user._id })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start conversation' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to start conversation`);
      }

      const conversation = await response.json();
      
      // Navigate to messages page with the conversation selected
      navigate('/messages', { state: { selectedConversation: conversation } });
    } catch (err) {
      console.error('Error starting conversation:', err);
      alert(`Error starting conversation: ${err.message}`);
    }
  };
  
  const avatarSize = sizeClasses[size] || sizeClasses.md;
  
  const avatarContent = (
    <div 
      className={`relative group ${avatarSize} ${className}`}
      onMouseEnter={() => setShowDropdown(true)}
      onMouseLeave={() => setShowDropdown(false)}
    >
      <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${
        showBorder ? 'border-2 border-gray-700 hover:border-gray-500' : ''
      } transition-colors duration-200 cursor-pointer`}>
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
      
      {/* Dropdown Menu */}
      {showDropdown && authUser && authUser._id !== user._id && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-max">
          <div className="py-1">
            <Link
              to={`/profile/${user.username}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              <FaUser className="text-xs" />
              View Profile
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDropdown(false);
                handleStartConversation(e);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors text-left"
            >
              <FaEnvelope className="text-xs" />
              Send Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
  
  return avatarContent;
};

export default Avatar;
