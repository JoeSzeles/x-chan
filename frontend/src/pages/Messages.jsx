import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import ConversationsList from '../components/messages/ConversationsList';
import GroupConversationsList from '../components/messages/GroupConversationsList';
import MessageContacts from '../components/messages/MessageContacts';
import ChatWindow from '../components/messages/ChatWindow';
import GroupChatWindow from '../components/messages/GroupChatWindow';
import PageHeader from '../components/common/PageHeader';
import Breadcrumb from '../components/common/Breadcrumb';
import LoadingSpinner from '../components/common/LoadingSpinner';
import socketService from '../services/socket';

const Messages = () => {
  const [activeTab, setActiveTab] = useState('conversations');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedGroupConversation, setSelectedGroupConversation] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notificationSoundsEnabled, setNotificationSoundsEnabled] = useState(
    localStorage.getItem('notificationSoundsEnabled') !== 'false' // Default to true
  );
  const [showGroupContacts, setShowGroupContacts] = useState(false);
  const { isUserOnline } = useOnlineStatus();

  // Enhanced notification sound functionality
  const playNotificationSound = () => {
    const soundsEnabled = localStorage.getItem('notificationSoundsEnabled') !== 'false';
    if (!soundsEnabled) return;

    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => {
        console.log('Could not play notification.mp3:', e);

        if (window.AudioContext || window.webkitAudioContext) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        }
      });
    } catch (error) {
      console.log('Notification sound error:', error);
    }
  };

  const { data: authUser, isLoading: authUserLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: 'include',
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Something went wrong");
        }
        return data;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (!socketService.isConnected) {
      console.log('🔌 Initializing socket service for Messages page');
      socketService.connect();
    }

    // Listen for new messages to play notification sound
    const handleNewMessage = (message) => {
      console.log('📨 Messages page received new message:', message);

      // Only play sound if message is not from current user
      if (message.senderId._id !== authUser._id) {
        // Check if any conversation/group chat window is currently open
        const isConversationOpen = selectedConversation !== null;
        const isGroupConversationOpen = selectedGroupConversation !== null;

        // Only play sound if no conversation window is open
        if (!isConversationOpen && !isGroupConversationOpen) {
          console.log('🔊 Playing notification sound - no conversation window open');
          playNotificationSound();
        } else {
          console.log('🔇 Not playing sound - conversation window is open');
        }
      }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.offNewMessage(handleNewMessage);
    };
  }, [authUser, selectedConversation, selectedGroupConversation]);

  // Show loading if we're still waiting for auth user
  if (authUserLoading) {
    return (
      <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen bg-[#121212]">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
          <p className="ml-4 text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  // If we don't have auth user, show error
  if (!authUser && !authUserLoading) {
    return (
      <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen bg-[#121212]">
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">Please log in to access messages</p>
        </div>
      </div>
    );
  }

  // The socket listeners are now handled in ConversationsList and ChatWindow components
  // to avoid conflicts and improve performance

  const handleStartConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setSelectedGroupConversation(null); // Clear group selection
    setActiveTab('conversations');
  };

  const handleSelectGroupConversation = (conversation) => {
    setSelectedGroupConversation(conversation);
    setSelectedConversation(null); // Clear regular conversation selection
    setActiveTab('groups');
  };

  return (
    <div className="flex-1 flex h-screen" style={{ backgroundColor: 'var(--color-bg-main)' }}>
      {/* Left sidebar */}
      <div className="w-1/3 border-r" style={{ 
        borderColor: 'var(--color-border-default)', 
        backgroundColor: 'var(--color-bg-card)' 
      }}>
        {/* Tab navigation */}
        <div className="flex border-b" style={{ borderColor: 'var(--color-border-default)' }}>
          <button
            onClick={() => {
              setActiveTab('conversations');
              setSelectedGroupConversation(null);
            }}
            className={`flex-1 py-3 px-2 text-center transition-colors duration-300 ${
              activeTab === 'conversations'
                ? ''
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: activeTab === 'conversations' ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: activeTab === 'conversations' ? 'var(--color-text-light)' : 'var(--color-text-secondary)'
            }}
          >
            <span className="text-sm">Conversations</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('groups');
              setSelectedConversation(null);
            }}
            className={`flex-1 py-3 px-2 text-center transition-colors duration-300 ${
              activeTab === 'groups'
                ? ''
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: activeTab === 'groups' ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: activeTab === 'groups' ? 'var(--color-text-light)' : 'var(--color-text-secondary)'
            }}
          >
            <span className="text-sm">Group Chat</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('contacts');
              setSelectedConversation(null);
              setSelectedGroupConversation(null);
            }}
            className={`flex-1 py-3 px-2 text-center transition-colors duration-300 ${
              activeTab === 'contacts'
                ? ''
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: activeTab === 'contacts' ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: activeTab === 'contacts' ? 'var(--color-text-light)' : 'var(--color-text-secondary)'
            }}
          >
            <span className="text-sm">Contacts</span>
          </button>
        </div>

        {/* Notification sound toggle */}
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-default)' }}>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            🔊 Sound notifications
          </span>
          <button
            onClick={() => {
              const newValue = !notificationSoundsEnabled;
              setNotificationSoundsEnabled(newValue);
              localStorage.setItem('notificationSoundsEnabled', newValue.toString());
            }}
            className={`w-10 h-6 rounded-full transition-colors duration-300 ${
              notificationSoundsEnabled ? 'bg-green-500' : 'bg-gray-400'
            } relative`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-300 ${
                notificationSoundsEnabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'conversations' ? (
                <ConversationsList
                  authUser={authUser}
                  onSelectConversation={setSelectedConversation}
                  selectedConversation={selectedConversation}
                  refreshTrigger={refreshTrigger}
                  onUnreadCountChange={() => {}}
                />
              ) : activeTab === 'groups' ? (
                <GroupConversationsList
                  authUser={authUser}
                  onSelectConversation={handleSelectGroupConversation}
                  selectedConversation={selectedGroupConversation}
                  refreshTrigger={refreshTrigger}
                />
              ) : (
                <MessageContacts 
                  authUser={authUser}
                  onStartConversation={handleStartConversation} 
                />
              )}
            </div>
          </div>

          {/* Right panel */}
      <div className="w-2/3" style={{ backgroundColor: 'var(--color-bg-main)' }}>
        {selectedConversation ? (
          <ChatWindow 
              conversation={selectedConversation} 
              authUser={authUser}
            />
        ) : selectedGroupConversation ? (
          <GroupChatWindow 
              conversation={selectedGroupConversation} 
              authUser={authUser}
            />
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="text-center">
              <h3 className="text-xl mb-2" style={{ color: 'var(--color-text-primary)' }}>Select a conversation</h3>
              <p>
                {activeTab === 'conversations' && 'Choose a conversation to start messaging'}
                {activeTab === 'groups' && 'Select a group chat or create a new one'}
                {activeTab === 'contacts' && 'Select a contact to start a conversation'}
              </p>
            </div>
          </div>
        )}
      </div>
        </div>
  );
};

export default Messages;