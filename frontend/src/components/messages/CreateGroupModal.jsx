
import React, { useState, useEffect } from 'react';
import Avatar from '../common/Avatar';

const CreateGroupModal = ({ isOpen, onClose, onCreateGroup, authUser }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [availableContacts, setAvailableContacts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen, authUser]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${authUser.username}/following`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableContacts(data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c._id === contact._id);
      if (isSelected) {
        return prev.filter(c => c._id !== contact._id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedContacts.length === 0) {
      alert('Please enter a group name and select at least one contact');
      return;
    }

    onCreateGroup({
      name: groupName,
      participants: selectedContacts.map(c => c._id)
    });

    // Reset form
    setGroupName('');
    setSelectedContacts([]);
    onClose();
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedContacts([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Group Chat</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Group Name Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Group Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={50}
          />
        </div>

        {/* Selected Contacts */}
        {selectedContacts.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected ({selectedContacts.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedContacts.map(contact => (
                <div
                  key={contact._id}
                  className="flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full"
                >
                  <Avatar user={contact} size="xs" />
                  <span className="text-sm">{contact.username}</span>
                  <button
                    onClick={() => toggleContact(contact)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Contacts */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Contacts
          </label>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading contacts...</p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {availableContacts.length > 0 ? (
                availableContacts.map(contact => {
                  const isSelected = selectedContacts.some(c => c._id === contact._id);
                  return (
                    <div
                      key={contact._id}
                      onClick={() => toggleContact(contact)}
                      className={`flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <Avatar user={contact} size="sm" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{contact.username}</p>
                        <p className="text-sm text-gray-500">{contact.fullName || 'User'}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>No contacts available</p>
                  <p className="text-sm">Follow some users to add them to group chats</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedContacts.length === 0 || loading}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
