import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initSocket, getSocketInstance } from '../../services/socket';

const MessageContacts = ({ onStartConversation }) => {
  const [followers, setFollowers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('followers'); // 'followers' or 'requests'

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching followers and requests...');
        const [followersRes, requestsRes] = await Promise.all([
          axios.get('/api/messages/followers', { withCredentials: true }),
          axios.get('/api/messages/requests', { withCredentials: true })
        ]);
        console.log('Followers response:', followersRes.data);
        console.log('Requests response:', requestsRes.data);
        
        setFollowers(followersRes.data);
        setRequests(requestsRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.error || 'Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await axios.post(
        `/api/messages/requests/${requestId}/accept`,
        {},
        { withCredentials: true }
      );
      setRequests(requests.filter(req => req._id !== requestId));
      onStartConversation(response.data.conversation);
    } catch (err) {
      console.error('Error accepting request:', err);
      setError(err.response?.data?.error || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await axios.post(
        `/api/messages/requests/${requestId}/reject`,
        {},
        { withCredentials: true }
      );
      setRequests(requests.filter(req => req._id !== requestId));
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err.response?.data?.error || 'Failed to reject request');
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 mb-2">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="text-blue-500 hover:text-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-2 px-4 text-center ${
            activeTab === 'followers'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('followers')}
        >
          Followers
        </button>
        <button
          className={`flex-1 py-2 px-4 text-center ${
            activeTab === 'requests'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({requests.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'followers' ? (
          followers.length === 0 ? (
            <div className="p-4 text-gray-500">No followers available to message</div>
          ) : (
            followers.map((follower) => (
              <div
                key={follower._id}
                className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onStartConversation({
                  participants: [follower],
                  _id: null // Will be created when first message is sent
                })}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={follower.profileImg || '/default-avatar.png'}
                    alt={follower.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-sm font-medium">{follower.username}</h3>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          requests.length === 0 ? (
            <div className="p-4 text-gray-500">No pending message requests</div>
          ) : (
            requests.map((request) => (
              <div key={request._id} className="p-4 border-b">
                <div className="flex items-center space-x-3 mb-2">
                  <img
                    src={request.senderId.profileImg || '/default-avatar.png'}
                    alt={request.senderId.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-sm font-medium">{request.senderId.username}</h3>
                    <p className="text-xs text-gray-500">
                      Wants to message you
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAcceptRequest(request._id)}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request._id)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-300"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default MessageContacts; 