import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import ConversationsList from '../components/messages/ConversationsList';
import MessageContacts from '../components/messages/MessageContacts';
import ChatWindow from '../components/messages/ChatWindow';
import PageHeader from '../components/common/PageHeader';
import Breadcrumb from '../components/common/Breadcrumb';
import LoadingSpinner from '../components/common/LoadingSpinner';
import socketService from '../services/socket';

const Messages = () => {
  const [activeTab, setActiveTab] = useState('conversations');
  const [selectedConversation, setSelectedConversation] = useState(null);
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

  // Initialize socket service when user is authenticated
  useEffect(() => {
    if (authUser && !authUserLoading) {
      console.log('🔌 Initializing socket service for Messages page');
      if (!socketService.isConnected) {
        socketService.connect();
      }
    }

    return () => {
      // Don't disconnect socket when leaving Messages page
      // Keep it connected for real-time notifications
    };
  }, [authUser, authUserLoading]);

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

  // Listen for new messages to trigger conversation list refresh
  useEffect(() => {
    if (authUser) {
      // Connect socket if not already connected
      // if (!socketService.isConnected) { // Assuming socketService is available globally or imported
      //   socketService.connect();
      // }

      const handleNewMessage = (message) => {
        console.log('Messages page received new message:', message);

        // If the message is not for the currently open conversation, 
        // trigger a refresh of the conversations list
        if (!selectedConversation || message.conversationId !== selectedConversation._id) {
          console.log('Triggering conversation list refresh');
          setRefreshTrigger(prev => prev + 1);
        }
      };

      // socketService.onNewMessage(handleNewMessage);  // Assuming socketService is available globally or imported

      // return () => {
      //   socketService.offNewMessage(handleNewMessage);
      // };
    }
  }, [authUser, selectedConversation]);

  const handleStartConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setActiveTab('conversations');
  };

  return (
    <div className="flex-1 flex overflow-hidden" style={{ 
      backgroundColor: 'var(--color-bg-main)',
      height: 'calc(100vh - 80px)', // Subtract header height
      maxHeight: 'calc(100vh - 80px)'
    }}>
      {/* Left sidebar */}
      <div className="w-1/3 border-r flex flex-col" style={{ 
        borderColor: 'var(--color-border-default)', 
        backgroundColor: 'var(--color-bg-card)',
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden'
      }}>
        {/* Tab navigation */}
        <div className="flex border-b" style={{ borderColor: 'var(--color-border-default)' }}>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 py-3 px-4 text-center transition-colors duration-300 ${
              activeTab === 'conversations'
                ? ''
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: activeTab === 'conversations' ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: activeTab === 'conversations' ? 'var(--color-text-light)' : 'var(--color-text-secondary)'
            }}
          >
            Conversations
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-3 px-4 text-center transition-colors duration-300 ${
              activeTab === 'contacts'
                ? ''
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: activeTab === 'contacts' ? 'var(--color-primary)' : 'var(--color-bg-card)',
              color: activeTab === 'contacts' ? 'var(--color-text-light)' : 'var(--color-text-secondary)'
            }}
          >
            Contacts
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
            <div className="flex-1" style={{ 
              overflow: 'hidden',
              height: 'calc(100% - 120px)' // Account for tabs and notification toggle
            }}>
              <div className="h-full overflow-y-auto">
                {activeTab === 'conversations' ? (
                <ConversationsList
                  authUser={authUser}
                  onSelectConversation={setSelectedConversation}
                  selectedConversation={selectedConversation}
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
          </div>

          {/* Right panel */}
      <div className="w-2/3 flex flex-col" style={{ 
        backgroundColor: 'var(--color-bg-main)', 
        height: '100%',
        overflow: 'hidden'
      }}>
        {selectedConversation ? (
          <ChatWindow 
              conversation={selectedConversation} 
              authUser={authUser}
            />
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="text-center">
              <h3 className="text-xl mb-2" style={{ color: 'var(--color-text-primary)' }}>Select a conversation</h3>
              <p>Choose a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
        </div>
  );
};

export default Messages;