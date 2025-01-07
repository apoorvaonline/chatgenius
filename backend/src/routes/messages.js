import express from 'express';
import Message from '../models/Message.js';

const router = express.Router();

// Get messages for a specific channel
router.get('/:channelId', async (req, res) => {
  try {
    
    // First, let's verify the channelId is valid
    if (!req.params.channelId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid channel ID format' });
    }

    // Let's do a raw find query and log the result
    const messages = await Message.find({ channel: req.params.channelId });

    // Let's also log what's in the database for this channel
    const allMessagesForChannel = await Message.find({ 
      channel: req.params.channelId 
    }).lean();
    
    // Return the sorted messages
    const sortedMessages = await Message.find({ 
      channel: req.params.channelId 
    }).sort({ timestamp: 1 });

    res.json(sortedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Add a test route to check all messages
router.get('/debug/all', async (req, res) => {
  try {
    const allMessages = await Message.find({}).lean();
    res.json({
      count: allMessages.length,
      messages: allMessages
    });
  } catch (error) {
    console.error('Error fetching all messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

export default router;
