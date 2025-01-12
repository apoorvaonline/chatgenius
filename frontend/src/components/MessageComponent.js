import React from 'react';

const MessageComponent = ({ 
  message, 
  isThreadParent = false, 
  isThreadReply = false 
}) => {
  return (
    <div className={`message ${isThreadParent ? 'thread-parent' : ''} ${isThreadReply ? 'thread-reply' : ''}`}>
      <div className="message-content">
        <span className="sender-name">
          {message.sender.name}
        </span>
        <div className="message-body">
          <span className="message-text">{message.content}</span>
        </div>
        <span className="timestamp">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
};

export default MessageComponent; 