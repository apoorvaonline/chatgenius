import React, { useState } from 'react';
import axios from 'axios';

const CreateChannel = ({ onChannelCreated }) => {
  const [channelName, setChannelName] = useState('');

  const handleCreateChannel = async () => {
    try {
      const response = await axios.post('http://localhost:5001/channels', { name: channelName });
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
    <div className="create-channel">
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
