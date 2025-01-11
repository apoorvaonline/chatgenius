import React, { useEffect } from 'react';
import axios from 'axios';

const ChannelList = ({ onSelectChannel, channels, setChannels, setCurrentChannel }) => {
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await axios.get('http://localhost:5001/channels');
        const transformedChannels = response.data.map(channel => ({
          id: channel._id,
          name: channel.name,
          participants: channel.participants
        }));
        setChannels(transformedChannels);

        const generalChannel = transformedChannels.find(channel => channel.name === 'general');
        if (generalChannel) {
          setCurrentChannel(generalChannel);
        }
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
    };

    fetchChannels();
  }, [setChannels, setCurrentChannel]);

  return (
    <div className="channel-list">
      <h3>Channels</h3>
      <ul>
        {channels.map((channel) => (
          <li key={channel.id} onClick={() => onSelectChannel(channel)}>
            {channel.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChannelList;
