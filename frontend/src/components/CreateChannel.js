import React, { useState } from 'react';
import axios from 'axios';

const CreateChannel = ({ onChannelCreated, currentUser }) => {
  const [channelName, setChannelName] = useState('');

  const handleCreateChannel = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/channels`, { 
        name: channelName, 
        isDM: false, 
        participants: [currentUser.id]
      });
      const transformedChannel = {
        id: response.data._id,
        name: response.data.name,
        participants: response.data.participants
      };
      onChannelCreated(transformedChannel);
      setChannelName('');
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  return (
    <div className="create-channel-section">
      <input
        type="text"
        value={channelName}
        onChange={(e) => setChannelName(e.target.value)}
        placeholder="Enter channel name"
      />
      <button className="create-channel-button" onClick={handleCreateChannel}>Create Channel</button>
    </div>
  );
};

export default CreateChannel;
