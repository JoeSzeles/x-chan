import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
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
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedGroupConversation, setSelectedGroupConversation] = useState(null);
  const [activeTab, setActiveTab] = useState('conversations');
  const location = useLocation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notificationSoundsEnabled, setNotificationSoundsEnabled] = useState(
    localStorage.getItem('notificationSoundsEnabled') !== 'false' // Default to true
  );

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

  // Initialize socket connection when Messages component mounts
  useEffect(() => {
    if (authUser && !authUserLoading) {
      console.log('🔌 Initializing socket service for Messages page');

      // Ensure socket is connected
      if (!socketService.isConnected) {
        socketService.connect();
      }
    }

    return () => {
      // Don't disconnect socket when leaving Messages page
      // Keep it connected for real-time notifications
    };
  }, [authUser, authUserLoading]);

  // Handle navigation from popup notifications
  useEffect(() => {
    if (location.state) {
      const { selectedConversation: navConversation, selectedGroupConversation: navGroupConversation, tab } = location.state;

      if (navConversation) {
        setSelectedConversation({ _id: navConversation });
        setSelectedGroupConversation(null);
        setActiveTab('conversations');
      } else if (navGroupConversation) {
        setSelectedGroupConversation({ _id: navGroupConversation });
        setSelectedConversation(null);
        setActiveTab('groups');
      }

      if (tab) {
        setActiveTab(tab);
      }

      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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