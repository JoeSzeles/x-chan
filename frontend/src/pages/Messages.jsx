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
		<div className="flex-1 flex h-screen" style={{ backgroundColor: 'var(--color-bg-main)' }}>
			{/* Left sidebar */}
			<div className="w-1/3 border-r" style={{ 
				borderColor: 'var(--color-border-default)', 
				backgroundColor: 'var(--color-bg-card)' 
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

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'conversations' ? (
                <ConversationsList onSelectConversation={setSelectedConversation} />
              ) : (
                <MessageContacts onStartConversation={handleStartConversation} />
              )}
            </div>
          </div>

          {/* Right panel */}
			<div className="w-2/3" style={{ backgroundColor: 'var(--color-bg-main)' }}>
				{selectedConversation ? (
					<ChatWindow conversation={selectedConversation} />
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