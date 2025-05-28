import React, { useState } from 'react';
import ConversationsList from '../components/messages/ConversationsList';
import ChatWindow from '../components/messages/ChatWindow';
import MessageContacts from '../components/messages/MessageContacts';

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' or 'contacts'

  const handleStartConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setActiveTab('conversations');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden h-[calc(100vh-8rem)]">
        <div className="flex h-full">
          {/* Left sidebar */}
          <div className="w-1/3 border-r flex flex-col">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                className={`flex-1 py-2 px-4 text-center ${
                  activeTab === 'conversations'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('conversations')}
              >
                Conversations
              </button>
              <button
                className={`flex-1 py-2 px-4 text-center ${
                  activeTab === 'contacts'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('contacts')}
              >
                Contacts
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'conversations' ? (
                <ConversationsList onSelectConversation={setSelectedConversation} />
              ) : (
                <MessageContacts onStartConversation={handleStartConversation} />
              )}
            </div>
          </div>

          {/* Chat window */}
          <div className="w-2/3">
            {selectedConversation ? (
              <ChatWindow conversation={selectedConversation} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages; 