import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5001');

const ChatWindow = ({ channel, userId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState({});
  const messagesEndRef = useRef(null); // Ref for scrolling

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5001/messages/${channel.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data);
        
        // Fetch user data for all unique senders
        const senderIds = [...new Set(response.data.map(msg => msg.sender))];
        const userPromises = senderIds.map(id => 
          axios.get(`http://localhost:5001/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
        
        const userResponses = await Promise.all(userPromises);
        const userMap = {};
        userResponses.forEach(response => {
          userMap[response.data.id] = response.data.name;
        });
        setUsers(userMap);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    // Clear messages when changing channels
    setMessages([]);
    
    if (channel && channel.id) {
      loadMessages();
      socket.emit('joinChannel', { channelId: channel.id, name: channel.name });
    }

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on('receiveMessage', handleNewMessage);

    return () => {
      socket.off('receiveMessage', handleNewMessage);
      if (channel && channel.id) {
        socket.emit('leaveChannel', { channelId: channel.id });
      }
    };
  }, [channel]);

  // Scroll to the bottom of the messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();

    if (newMessage.trim() && userId && channel && channel.id) {
      const messageData = {
        sender: userId,
        content: newMessage.trim(),
        channelId: channel.id
      };
      
      socket.emit('sendMessage', messageData);
      setNewMessage('');
    } else {
      console.error('Message validation failed:', {
        hasContent: Boolean(newMessage.trim()),
        hasUserId: Boolean(userId),
        hasChannel: Boolean(channel),
        hasChannelId: Boolean(channel?.id)
      });
    }
  };

  return (
    <div className="chat-window">
      <div className="channel-header">
        <h2># {channel.name}</h2>
      </div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender === userId ? 'sent' : 'received'}`}>
            <div className="content-wrapper">
              <span className="sender-name">
                {msg.sender === userId ? 'You:' : `${users[msg.sender] || 'Unknown User'}:`}
              </span>
              <span className="content">{msg.content}</span>
            </div>
            <span className="timestamp">
              {new Date(msg.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit'
              })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Empty div for scrolling */}
      </div>
      <form onSubmit={sendMessage} className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatWindow;
