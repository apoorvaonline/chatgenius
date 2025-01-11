import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ChatWindow from './components/ChatWindow';
import ChannelList from './components/ChannelList';
import CreateChannel from './components/CreateChannel';
import UserList from './components/UserList';
import SearchResults from './components/SearchResults';
import UserStatus from './components/UserStatus';
import './App.css';
import axios from 'axios';
import io from 'socket.io-client';

function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Check for stored auth token on mount
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user data
      const verifyAuth = async () => {
        try {
          const response = await axios.get('http://localhost:5001/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data.user);
          setView('chat');
        } catch (error) {
          console.error('Auth verification failed:', error);
          handleLogout();
        }
      };
      verifyAuth();
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setView('login');
    setCurrentChannel(null);
  };

  const handleLoginSuccess = (userData) => {
    console.log('Login success, user data:', userData);
    setUser(userData);
    setView('chat');
  };

  const handleChannelCreated = (channel) => {
    setCurrentChannel(channel);
    setChannels(prevChannels => [...prevChannels, channel]);
  };

  const handleSelectChannel = (channel) => {
    setCurrentChannel(channel);
  };

  const handleSelectUser = async (selectedUser) => {
    try {
      // Check if DM channel exists
      const response = await axios.get(`http://localhost:5001/channels/dm/${user.id}/${selectedUser._id}`);
      
      if (response.data) {
        // If DM channel exists, set it as current
        const dmChannel = {
          ...response.data,
          id: response.data._id,
          name: selectedUser.name
        };
        setCurrentChannel(dmChannel);
        setSelectedUser(selectedUser);
      } else {
        // Create new DM channel
        const newChannel = await axios.post('http://localhost:5001/channels', {
          name: `dm_${user.id}_${selectedUser._id}`,
          isDM: true,
          participants: [user.id, selectedUser._id]
        });
        
        const transformedChannel = {
          ...newChannel.data,
          id: newChannel.data._id,
          name: selectedUser.name
        };
        
        setCurrentChannel(transformedChannel);
        setSelectedUser(selectedUser);
        setChannels(prevChannels => [...prevChannels, transformedChannel]);
      }
    } catch (error) {
      console.error('Error handling DM:', error);
    }
  };

  const handleTabChange = (tab) => {
    setView(tab);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5001/messages/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const socket = io.connect('http://localhost:5001');
    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ChatGenius</h1>
        {view === 'chat' && (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        )}
      </header>
      
      {view === 'chat' && user ? (
        <div className="main-content">
          <nav className="sidebar">
            <div className="sidebar-content">
              <div className="channels-section">
                <ChannelList 
                  onSelectChannel={handleSelectChannel} 
                  channels={channels}
                  setChannels={setChannels}
                  setCurrentChannel={setCurrentChannel}
                />
                <CreateChannel 
                  onChannelCreated={handleChannelCreated} 
                  currentUser={user}
                />
                <UserList 
                  onSelectUser={handleSelectUser}
                  currentUser={user}
                  socket={socket}
                />
              </div>
            </div>
            <div className="user-info">
              <h3>{user.name}</h3>
              <UserStatus userId={user.id} socket={socket} />
            </div>
          </nav>
          
          {currentChannel ? (
            searchResults !== null ? (
              <SearchResults results={searchResults} />
            ) : (
              <ChatWindow 
                userId={user.id}
                channel={currentChannel}
                isDM={selectedUser !== null}
                dmUser={selectedUser}
              />
            )
          ) : (
            <div className="select-channel-prompt">
              Select a channel or user to start chatting
            </div>
          )}
        </div>
      ) : (
        <div className="auth-container">
          <div className="auth-content">
            <div className="tab-buttons">
              <button onClick={() => handleTabChange('login')} className={view === 'login' ? 'active' : ''}>
                Login
              </button>
              <button onClick={() => handleTabChange('register')} className={view === 'register' ? 'active' : ''}>
                Register
              </button>
            </div>
            {view === 'login' && <LoginForm onLoginSuccess={handleLoginSuccess} />}
            {view === 'register' && <RegisterForm onLoginSuccess={handleLoginSuccess} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
