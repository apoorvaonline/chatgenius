import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import EmojiPickerComponent from './EmojiPicker';
import ThreadView from './ThreadView';


const socket = io('http://ec2-3-141-0-15.us-east-2.compute.amazonaws.com:5000', {
  transports: ['websocket', 'polling'],
});
socket.on('connect_error', (err) => console.error("Socket connection error:", err));
const MESSAGE_LIMIT = 50;

// Create a separate Message component
const MessageComponent = ({ 
  message, 
  userId, 
  users, 
  refreshFileUrl,
  handleReaction,
  pickerVisible,
  setPickerVisible,
  onThreadClick
}) => {
  const [fileUrl, setFileUrl] = useState(message.file?.url);
  const [urlError, setUrlError] = useState(false);

  const handleUrlError = async () => {
    setUrlError(true);
    const newUrl = await refreshFileUrl(message.file.key);
    if (newUrl) {
      setFileUrl(newUrl);
      setUrlError(false);
    }
  };

  useEffect(() => {
    if (message.file?.key) {
      refreshFileUrl(message.file.key).then(newUrl => {
        if (newUrl) setFileUrl(newUrl);
      });

      const interval = setInterval(async () => {
        const newUrl = await refreshFileUrl(message.file.key);
        if (newUrl) setFileUrl(newUrl);
      }, 45 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [message.file, refreshFileUrl]);


  const getFileIcon = (contentType) => {
    switch(contentType) {
      case 'application/pdf':
        return '📄';
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '📝';
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return '📊';
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return '📊';
      case 'text/plain':
        return '📃';
      default:
        return '📎';
    }
  };

  const isOfficeDocument = (contentType) => {
    return [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ].includes(contentType);
  };

  const getOfficePreviewUrl = (fileUrl) => {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}&ui=false&rs=false&wdHideHeaders=True`;
  };

  return (
    <div className="message">
      <div className="message-content">
        <span className="sender-name">
          {message.sender._id === userId || message.sender === userId ? 'You' : (message.sender.name || users[message.sender] || 'Unknown User')}
        </span>
        <div className="message-body">
          <span className="message-text">{message.content}</span>
          
          {/* Add reactions display */}
          <div className="reactions-container">
            {message.reactions?.map((reaction, index) => (
              <div 
                key={index} 
                className="reaction"
                onClick={() => handleReaction(message._id, reaction.emoji)}
                title={`${reaction.users.length} ${reaction.users.length === 1 ? 'user' : 'users'}`}
              >
                <span>{reaction.emoji}</span>
                <span className="count">{reaction.users.length}</span>
              </div>
            ))}
            {/* Add reaction button */}
            <button 
              className="add-reaction-button"
              onClick={() => {
                setPickerVisible(message._id);
              }}
            >
              +
            </button>
            <div className="message-actions">
              <button 
                className="thread-button"
                onClick={() => onThreadClick(message)}
              >
                {'Reply'}
              </button>
              {message.threadReplyCount > 0 && (
                <span className="thread-count">
                  {message.threadReplyCount} {message.threadReplyCount === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
          </div>

          {pickerVisible === message._id && (
            <div className="message-emoji-picker">
              <EmojiPickerComponent
                onEmojiClick={(emojiObject) => {
                  handleReaction(message._id, emojiObject.emoji);
                  setPickerVisible(null);
                }}
              />
            </div>
          )}
          
          {message.file && (
            <div className="file-message">
              {message.file.contentType?.startsWith('image/') ? (
                <div className="image-preview">
                  <img 
                    src={fileUrl} 
                    alt={message.file.filename}
                    className="message-image-preview"
                    onClick={() => window.open(fileUrl, '_blank')}
                    onError={handleUrlError}
                  />
                  <a 
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-link"
                  >
                    {message.file.filename}
                  </a>
                </div>
              ) : message.file.contentType === 'application/pdf' ? (
                <div className="document-preview">
                  <iframe
                    src={`${fileUrl}#view=FitW&toolbar=0`}
                    title={message.file.filename}
                    className="pdf-preview"
                    onError={handleUrlError}
                  />
                  <a 
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-download-link"
                  >
                    <span role="img" aria-label="document">
                      {getFileIcon(message.file.contentType)}
                    </span>
                    {message.file.filename}
                  </a>
                </div>
              ) : isOfficeDocument(message.file.contentType) ? (
                <div className="document-preview">
                  <iframe
                    src={getOfficePreviewUrl(fileUrl)}
                    title={message.file.filename}
                    className="pdf-preview"
                    onError={handleUrlError}
                  />
                  <a 
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-download-link"
                  >
                    <span role="img" aria-label="document">
                      {getFileIcon(message.file.contentType)}
                    </span>
                    {message.file.filename}
                  </a>
                </div>
              ) : (
                <div className="document-preview">
                  <div className="file-icon">
                    <span role="img" aria-label="document">
                      {getFileIcon(message.file.contentType)}
                    </span>
                  </div>
                  <a 
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-download-link"
                  >
                    {message.file.filename}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="timestamp">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit'
          })}
        </span>

      </div>
      {urlError && <div className="url-refresh-message">Refreshing file access...</div>}
    </div>
  );
};

const ChatWindow = ({ channel, userId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(null);
  const inputRef = useRef(null);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);

  // Create a ref to store users
  const usersRef = useRef(users);
  usersRef.current = users; // Keep ref in sync with state

  // Create a function to fetch user info
  const fetchUserInfo = useCallback(async (senderId) => {
    if (senderId === userId || usersRef.current[senderId]) return;
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/users/${senderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(prev => ({
        ...prev,
        [senderId]: response.data.name
      }));
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }, [userId]);

  const loadMessages = useCallback(async (skipCount = 0, append = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = `${process.env.REACT_APP_BACKEND_URL}/messages/${channel.id}`;
      
      const response = await axios.get(
        `${endpoint}?limit=${MESSAGE_LIMIT}&skip=${skipCount}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { messages: newMessages, hasMore: moreMessages } = response.data;
      setHasMore(moreMessages);
      
      setMessages(prev => append ? [...newMessages, ...prev] : newMessages);

      const senderIds = [...new Set(newMessages.map(msg => msg.sender._id))];
      const userPromises = senderIds.map(id => 
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      const userResponses = await Promise.all(userPromises);
      setUsers(prev => {
        const newUserMap = { ...prev };
        userResponses.forEach(response => {
          newUserMap[response.data.id] = response.data.name;
        });
        return newUserMap;
      });
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [channel]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loading || !hasMore) return;

    if (container.scrollTop < 100) {
      setSkip(prev => prev + MESSAGE_LIMIT);
      loadMessages(skip + MESSAGE_LIMIT, true);
    }

    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    setShouldScrollToBottom(isAtBottom);
  }, [loading, hasMore, skip, loadMessages]);

  useEffect(() => {
    setMessages([]);
    setSkip(0);
    setHasMore(true);
    setShouldScrollToBottom(true);
    
    if (channel && channel.id) {
      loadMessages(0, false);
      socket.emit('joinChannel', { channelId: channel.id, name: channel.name });
    }

    const handleNewMessage = async (message) => {
      // Fetch user info if needed, but don't make the effect depend on it
      console.log(`Message received with data: ${message.sender}`);
      fetchUserInfo(message.sender);
      setMessages(prev => [...prev, message]);
    };

    socket.on('receiveMessage', handleNewMessage);

    // Add reaction update listener
    socket.on('messageReaction', ({ messageId, reactions }) => {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    });

    return () => {
      socket.off('receiveMessage', handleNewMessage);
      if (channel && channel.id) {
        socket.emit('leaveChannel', { channelId: channel.id });
      }
      socket.off('messageReaction');
    };
  }, [channel, loadMessages, fetchUserInfo]); // Remove users from dependencies

  // Scroll to bottom effect
  useEffect(() => {
    if (messagesEndRef.current && shouldScrollToBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldScrollToBottom]);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const truncateFileName = (fileName, maxLength = 20) => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.slice(0, -(extension.length + 1));
    const truncated = nameWithoutExt.slice(0, maxLength - 3) + '...';
    return `${truncated}.${extension}`;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !selectedFile) || !userId || !channel) return;

    try {
      let fileData = null;
      let messageContent = newMessage.trim();
      
      if (selectedFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        fileData = {
          url: response.data.url,
          filename: response.data.filename,
          contentType: selectedFile.type,
          size: response.data.size,
          key: response.data.key
        };

        // If no text message, use filename as content
        if (!messageContent) {
          messageContent = selectedFile.name;
        }
      }

      const messageData = {
        content: messageContent,
        channelId: channel.id,
        sender: userId,
        file: fileData,
      };

      console.log(`Emitting sendMessage event with data: ${JSON.stringify(messageData, null, 2)}`);
      socket.emit('sendMessage', messageData);
      setNewMessage('');
      setSelectedFile(null);
      setShouldScrollToBottom(true);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const refreshFileUrl = useCallback(async (fileKey) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/upload/url/${fileKey}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data.url;
    } catch (error) {
      console.error('Error refreshing file URL:', error);
      return null;
    }
  }, []);

  const handleEmojiClick = (emojiObject) => {
    const cursor = inputRef.current.selectionStart;
    const text = newMessage.slice(0, cursor) + emojiObject.emoji + newMessage.slice(cursor);
    setNewMessage(text);
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }
      
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/messages/${messageId}/reactions`,
        { emoji },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg._id === messageId ? { ...msg, reactions: response.data.reactions } : msg
        )
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.message-emoji-picker') && 
          !event.target.closest('.add-reaction-button')) {
        setPickerVisible(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found in localStorage');
          return;
        }

        await axios.get(`${process.env.REACT_APP_BACKEND_URL}/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Token verification failed:', error);
      }
    };

    verifyToken();
  }, []);

  const onThreadClick = (message) => {
    setSelectedThread(message);
  };

  return (
    <div className="chat-main">
      <div className="channel-header">
        <h2># {channel.name}</h2>
      </div>
      <div className="messages" ref={messagesContainerRef}>
        {loading && skip === 0 && <div className="loading">Loading messages...</div>}
        {loading && skip > 0 && <div className="loading">Loading more messages...</div>}
        {messages.map((message) => (
          <MessageComponent
            key={message._id || Math.random()}
            message={message}
            userId={userId}
            users={users}
            refreshFileUrl={refreshFileUrl}
            handleReaction={handleReaction}
            pickerVisible={pickerVisible}
            setPickerVisible={setPickerVisible}
            onThreadClick={onThreadClick}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="message-input">
        <form onSubmit={sendMessage}>
          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
            />
            {selectedFile && (
              <div className="selected-file">
                <span className="file-name">
                  {truncateFileName(selectedFile.name)}
                </span>
                <button
                  type="button"
                  className="remove-file"
                  onClick={() => setSelectedFile(null)}
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div className="message-actions">
            <div className="emoji-picker-wrapper" style={{ position: 'relative' }}>
              <button
                type="button"
                className="emoji-button"
                onClick={() => setShowInputEmojiPicker(!showInputEmojiPicker)}
              >
                <span role="img" aria-label="emoji">😊</span>
              </button>
              {showInputEmojiPicker && (
                <div className="input-emoji-picker">
                  <EmojiPickerComponent
                    onEmojiClick={(emojiObject) => {
                      handleEmojiClick(emojiObject);
                      setShowInputEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              className="upload-button"
            >
              <span role="img" aria-label="attachment">📎</span>
            </button>
            <button type="submit" disabled={uploading}>
              {uploading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
      {selectedThread && (
        <ThreadView
          parentMessage={selectedThread}
          onClose={() => setSelectedThread(null)}
        />
      )}
    </div>
  );
};

export default ChatWindow;
