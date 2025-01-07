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

// Initialize environment and app
dotenv.config();
const app = express();
const server = http.createServer(app); // Wrap Express app with HTTP server
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (adjust for production)
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(express.json());
app.use(cors());
app.use('/channels', channelRoutes);
app.use('/messages', messageRoutes);

// Routes
app.use('/auth', authRoutes);

// Socket.IO setup
io.on('connection', (socket) => {

  socket.on('sendMessage', async (data) => {
    try {
      const { sender, content, channelId } = data;
      
      if (!sender || !content || !channelId) {
        console.error('Missing required message data:', {
          hasSender: Boolean(sender),
          hasContent: Boolean(content),
          hasChannelId: Boolean(channelId),
          senderType: typeof sender,
          channelIdType: typeof channelId
        });
        return;
      }

      // Create and save the message
      const message = new Message({
        sender,
        content,
        channel: channelId
      });
            
      const savedMessage = await message.save();

      // Transform _id to id when broadcasting
      io.to(channelId).emit('receiveMessage', {
        id: savedMessage._id.toString(),
        sender: savedMessage.sender,
        content: savedMessage.content,
        channel: savedMessage.channel,
        timestamp: savedMessage.timestamp
      });
    } catch (error) {
      console.error('Error saving message:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      if (error.errors) {
        console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
      }
    }
  });

  socket.on('joinChannel', (data) => {
    const { channelId, name } = data;
    socket.join(channelId);
  });

  socket.on('leaveChannel', (data) => {
    const { channelId } = data;
    socket.leave(channelId);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Connect to DB and start server
connectDB();
server.listen(5001, () => console.log('Server running on port 5001'));
