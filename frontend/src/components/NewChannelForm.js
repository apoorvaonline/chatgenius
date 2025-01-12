import React, { useState } from 'react';
import axios from 'axios';

const NewChannelForm = ({ userId }) => {
  const [channelName, setChannelName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const channel = { name: channelName, participants: [userId] };
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/channels`, channel);
      alert('Channel created successfully');
      setChannelName('');
    } catch (error) {
      console.error(error);
      alert('Failed to create channel');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={channelName}
        onChange={(e) => setChannelName(e.target.value)}
        placeholder="Channel Name"
      />
      <button type="submit">Create Channel</button>
    </form>
  );
};

export default NewChannelForm;
