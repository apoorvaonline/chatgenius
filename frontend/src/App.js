import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ChatWindow from './components/ChatWindow';
import ChannelList from './components/ChannelList';
import CreateChannel from './components/CreateChannel';
import './App.css';
import axios from 'axios';

function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [channels, setChannels] = useState([]);

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

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ChatGenius</h1>
        {view === 'chat' && (
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        )}
        {view !== 'chat' && (
          <nav>
            <button onClick={() => setView('login')} className={view === 'login' ? 'active' : ''}>
              Login
            </button>
            <button onClick={() => setView('register')} className={view === 'register' ? 'active' : ''}>
              Register
            </button>
          </nav>
        )}
      </header>
      <main>
        {view === 'login' && <LoginForm onLoginSuccess={handleLoginSuccess} />}
        {view === 'register' && <RegisterForm onLoginSuccess={handleLoginSuccess} />}
        {view === 'chat' && user && (
          <div className="chat-layout">
            <nav className="sidebar">
              <div className="user-info">
                <span>👤 {user.name || user.email}</span>
              </div>
              <CreateChannel onChannelCreated={handleChannelCreated} />
              <ChannelList 
                onSelectChannel={handleSelectChannel} 
                channels={channels}
                setChannels={setChannels}
              />
            </nav>
            <div className="chat-main">
              {currentChannel ? (
                <ChatWindow 
                  userId={user.id}
                  channel={currentChannel}
                />
              ) : (
                <div className="select-channel-prompt">
                  👈 Select a channel or create a new one to start chatting
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
