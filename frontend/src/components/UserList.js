import React, { useEffect, useState } from 'react';
import axios from 'axios';

const UserList = ({ onSelectUser, currentUser, socket }) => {
  const [users, setUsers] = useState([]);
  const [userStatuses, setUserStatuses] = useState({});

  const statusIcons = {
    online: { emoji: '🟢', label: 'Online' },
    away: { emoji: '🟡', label: 'Away' },
    dnd: { emoji: '🔴', label: 'Do Not Disturb' },
    offline: { emoji: '⚫', label: 'Offline' }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/users`);
        // Filter out the current user from the list
        const otherUsers = response.data.filter(user => user._id !== currentUser.id);
        setUsers(otherUsers);
        
        // Initialize statuses
        const initialStatuses = {};
        otherUsers.forEach(user => {
          initialStatuses[user._id] = user.status || 'offline';
        });
        setUserStatuses(initialStatuses);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [currentUser.id]);

  useEffect(() => {
    if (!socket) return;

    socket.on('userStatusChange', ({ userId, status }) => {
      setUserStatuses(prev => ({
        ...prev,
        [userId]: status
      }));
    });

    return () => {
      socket.off('userStatusChange');
    };
  }, [socket]);

  return (
    <div className="channel-list">
      <h3>Direct Messages</h3>
      <ul>
        {users.map((user) => (
          <li key={user._id} onClick={() => onSelectUser(user)}>
            <span className="user-list-item">
              <span>{user.name}</span>
              <span className="status-indicator">
                <span 
                  role="img" 
                  aria-label={statusIcons[userStatuses[user._id] || 'offline'].label}
                >
                  {statusIcons[userStatuses[user._id] || 'offline'].emoji}
                </span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList; 