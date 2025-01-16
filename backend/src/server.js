import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import http from 'http'; 
import { Server } from 'socket.io'; 
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import Message from './models/Message.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import userRoutes from './routes/user.js';
import uploadRoutes from './routes/upload.js';
import User from './models/User.js';
import messageService from './services/messageService.js';

// Initialize environment and app 
dotenv.config();
const app = express();
const server = http.createServer(app); // Wrap Express app with HTTP server

const allowedOrigins = [
  'https://chatgenius-pink.vercel.app', 
  'http://localhost:3000',
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(express.json());
// app.use(cors());
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

// Routes
app.use('/auth', authRoutes);
app.use('/messages', messageRoutes);
app.use('/channels', channelRoutes);
app.use('/users', userRoutes);
app.use('/upload', uploadRoutes);

// Socket.IO setup
io.on('connection', (socket) => {

  socket.on('sendMessage', async (data) => {
    try {
      const { sender, content, channelId, file } = data;
      
      if (!sender || !content || !channelId) {
        console.error('Missing required message data');
        return;
      }

      await messageService.saveMessage({ sender, content, channelId, file });
      
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('joinChannel', ({ channelId }) => {
    socket.join(channelId);
  });

  socket.on('leaveChannel', ({ channelId }) => {
    socket.leave(channelId);
  });

  socket.on('updateStatus', async (data) => {
    try {
      const { userId, status } = data;
      await User.findByIdAndUpdate(userId, { 
        status,
        lastActive: new Date()
      });
      
      io.emit('userStatusChange', { userId, status });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  });

  socket.on('disconnect', async () => {
    try {
      // Get userId from socket (you'll need to store this when user connects)
      const userId = socket.userId;
      if (userId) {
        await User.findByIdAndUpdate(userId, { 
          status: 'offline',
          lastActive: new Date()
        });
        
        io.emit('userStatusChange', { 
          userId, 
          status: 'offline' 
        });
      }
    } catch (error) {
      console.error('Error updating disconnect status:', error);
    }
  });
});

// Connect to DB and start server
connectDB();
server.listen(process.env.PORT, () => console.log('Server running on port', process.env.PORT));

// Make io available to routes
app.set('io', io);

// Make saveMessage available to routes
app.set('saveMessage', messageService.saveMessage.bind(messageService));

// After creating the io instance
global.io = io;
