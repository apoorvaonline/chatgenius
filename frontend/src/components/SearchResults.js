import React from 'react';

const SearchResults = ({ results }) => {
  return (
    <div className="chat-main">
      <div className="channel-header">
        <h2>Search Results</h2>
      </div>
      <div className="messages">
        {results.map((result) => (
          <div className="message" key={result._id}>
            <div className="message-content">
              <span className="sender-name">
                {result.senderName}
              </span>
              <span className="message-text">{result.content}</span>
              <span className="timestamp">
                {new Date(result.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            No results found
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults; 