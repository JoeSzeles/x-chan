
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCircle, FaEnvelope } from 'react-icons/fa';
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
    <div className={`relative group ${avatarSize} ${className}`}>
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
      {showMessageIcon && authUser && authUser._id !== user._id && (
        <button
          onClick={handleStartConversation}
          className="absolute top-0 left-0 w-full h-full rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title={`Message ${user.username}`}
        >
          <FaEnvelope 
            className="text-white" 
            style={{ 
              fontSize: size === 'xs' || size === 'sm' ? '10px' : '14px' 
            }} 
          />
        </button>
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
