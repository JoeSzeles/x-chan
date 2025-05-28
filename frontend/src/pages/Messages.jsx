import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import ConversationsList from '../components/messages/ConversationsList';
import MessageContacts from '../components/messages/MessageContacts';
import ChatWindow from '../components/messages/ChatWindow';
import PageHeader from '../components/common/PageHeader';
import Breadcrumb from '../components/common/Breadcrumb';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Messages = () => {
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [activeTab, setActiveTab] = useState('conversations');

	// Use the same auth pattern as other pages
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
                <ConversationsList
								authUser={authUser}
								onSelectConversation={setSelectedConversation}
								selectedConversation={selectedConversation}
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