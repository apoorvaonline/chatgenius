import React, { useState, useEffect } from 'react';

const UserStatus = ({ userId, socket }) => {
  const [status, setStatus] = useState('offline');
  const [isOpen, setIsOpen] = useState(false);

  const statusIcons = {
    online: { emoji: '🟢', label: 'Online' },
    away: { emoji: '🟡', label: 'Away' },
    dnd: { emoji: '🔴', label: 'Do Not Disturb' },
    offline: { emoji: '⚫', label: 'Offline' }
  };

  useEffect(() => {
    // Set initial status to online
    setStatus('online');
    socket.emit('updateStatus', { userId, status: 'online' });
  }, [userId, socket]);

  useEffect(() => {
    let inactivityTimer;
    let lastActivity = Date.now();

    const updateLastActivity = () => {
      lastActivity = Date.now();
      if (status === 'away') {
        setStatus('online');
        socket.emit('updateStatus', { userId, status: 'online' });
      }
    };

    const checkInactivity = () => {
      const inactiveTime = Date.now() - lastActivity;
      if (inactiveTime > 5 * 60 * 1000 && status === 'online') { // 5 minutes
        setStatus('away');
        socket.emit('updateStatus', { userId, status: 'away' });
      }
    };

    // Activity listeners
    window.addEventListener('mousemove', updateLastActivity);
    window.addEventListener('keydown', updateLastActivity);
    window.addEventListener('click', updateLastActivity);

    // Inactivity checker
    inactivityTimer = setInterval(checkInactivity, 60000); // Check every minute

    // Socket listeners
    socket.on('userStatusChange', (data) => {
      if (data.userId === userId) {
        setStatus(data.status);
      }
    });

    return () => {
      window.removeEventListener('mousemove', updateLastActivity);
      window.removeEventListener('keydown', updateLastActivity);
      window.removeEventListener('click', updateLastActivity);
      clearInterval(inactivityTimer);
    };
  }, [userId, socket, status]);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    socket.emit('updateStatus', { userId, status: newStatus });
    setIsOpen(false);
  };

  return (
    <div className="user-status">
      <div className="status-indicator" onClick={() => setIsOpen(!isOpen)}>
        <span role="img" aria-label={statusIcons[status].label}>
          {statusIcons[status].emoji}
        </span>
      </div>
      
      {isOpen && (
        <div className="status-dropdown">
          <div onClick={() => handleStatusChange('online')}>
            <span role="img" aria-label="Online">🟢</span> Online
          </div>
          <div onClick={() => handleStatusChange('away')}>
            <span role="img" aria-label="Away">🟡</span> Away
          </div>
          <div onClick={() => handleStatusChange('dnd')}>
            <span role="img" aria-label="Do Not Disturb">🔴</span> Do Not Disturb
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStatus; 