import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import MessageComponent from './MessageComponent';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const ThreadView = ({ parentMessage, onClose }) => {
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const sendReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/messages/${parentMessage._id}/thread`,
        { content: newReply },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      setReplies([...replies, response.data]);
      setNewReply('');
      
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  useEffect(() => {
    const loadReplies = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${BACKEND_URL}/messages/${parentMessage._id}/thread`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        setReplies(response.data.replies);
      } catch (error) {
        console.error('Error fetching replies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReplies();

    // Set up socket listener for new replies
    const socket = io(BACKEND_URL);
    
    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('threadReply', (data) => {
      if (data.parentMessageId === parentMessage._id) {
        setReplies(prevReplies => [...prevReplies, data.reply]);
      }
    });

    return () => {
      socket.off('threadReply');
      socket.disconnect();
    };
  }, [parentMessage._id]);

  return (
    <div className="thread-view">
      <div className="thread-header">
        <h3>Thread</h3>
        <button onClick={onClose}>&times;</button>
      </div>
      
      <div className="thread-parent">
        <MessageComponent message={parentMessage} isThreadParent={true} />
      </div>

      <div className="thread-replies">
        {loading ? (
          <div className="loading">Loading replies...</div>
        ) : (
          <>
            {replies.map(reply => (
              <MessageComponent 
                key={reply._id} 
                message={reply} 
                isThreadReply={true} 
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={sendReply} className="thread-input">
        <input
          type="text"
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
          placeholder="Reply to thread..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ThreadView; 