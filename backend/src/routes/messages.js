import express from 'express';
import Message from '../models/Message.js';
import { auth } from './auth.js';
import Channel from '../models/Channel.js';
import messageService from '../services/messageService.js';

const router = express.Router();

// Search messages
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json([]);
    }

    // Search in messages and populate sender information
    const messages = await Message.find({
      $or: [
        { content: { $regex: q, $options: 'i' } }
      ]
    })
    .populate('sender', 'name')
    .sort({ timestamp: -1 })
    .limit(50);

    // Transform the results to include sender name
    const results = messages.map(msg => ({
      _id: msg._id,
      content: msg.content,
      timestamp: msg.timestamp,
      senderName: msg.sender.name,
      channelId: msg.channel
    }));

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Error performing search' });
  }
});

// Get messages for a specific channel
router.get('/:channelId', auth, async (req, res) => {
  try {
    if (!req.params.channelId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid channel ID format' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const totalMessages = await Message.countDocuments({ channel: req.params.channelId });
    
    const messages = await Message.find({ 
      channel: req.params.channelId,
      parentMessageId: null
    })
    .populate('sender', 'name')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
   
    res.json({
      messages: sortedMessages,
      hasMore: totalMessages > skip + limit,
      total: totalMessages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Add POST endpoint for reactions
router.post('/:messageId/reactions', auth, async (req, res) => {
  try {
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { messageId } = req.params;
    const { emoji } = req.body;
    
    // Ensure we have a valid user ID
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid user ID' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Initialize reactions array if it doesn't exist
    if (!message.reactions) {
      message.reactions = [];
    }

    // Find existing reaction with this emoji
    const existingReaction = message.reactions.find(r => r.emoji === emoji);

    if (existingReaction) {
      // Toggle user's reaction
      const userIndex = existingReaction.users.findIndex(id => id.toString() === userId.toString());
      if (userIndex > -1) {
        // Remove user's reaction
        existingReaction.users.splice(userIndex, 1);
        if (existingReaction.users.length === 0) {
          // Remove reaction if no users left
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        // Add user's reaction
        existingReaction.users.push(userId);
      }
    } else {
      // Create new reaction
      message.reactions.push({
        emoji,
        users: [userId]
      });
    }

    await message.save();
    
    // Emit socket event to update other clients
    req.app.get('io').to(message.channel.toString()).emit('messageReaction', {
      messageId: message._id,
      reactions: message.reactions
    });

    res.json({ reactions: message.reactions });
  } catch (error) {
    console.error('Detailed error:', {
      error: error.message,
      stack: error.stack,
      user: req.user,
      messageId: req.params.messageId,
      emoji: req.body.emoji
    });
    res.status(500).json({ error: 'Error handling reaction' });
  }
});

// Add thread reply endpoint
router.post('/:messageId/thread', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    // Find parent message
    const parentMessage = await Message.findById(messageId);
    if (!parentMessage) {
      return res.status(404).json({ error: 'Parent message not found' });
    }

    // Use shared saveMessage function
    const saveMessage = req.app.get('saveMessage');
    const messages = await saveMessage({
      content,
      sender: req.user._id,
      channelId: parentMessage.channel,
      parentMessageId: messageId
    });

    // Update parent message
    parentMessage.isThreadParent = true;
    parentMessage.threadReplyCount = (parentMessage.threadReplyCount || 0) + messages.length;
    parentMessage.lastReplyTimestamp = new Date();
    await parentMessage.save();

    res.status(201).json(messages);
  } catch (error) {
    console.error('Error creating thread reply:', error);
    res.status(500).json({ error: 'Error creating thread reply' });
  }
});

// Get thread replies
router.get('/:messageId/thread', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const replies = await Message.find({ parentMessageId: messageId })
      .populate('sender', 'name')
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit);

    const totalReplies = await Message.countDocuments({ parentMessageId: messageId });

    res.json({
      replies,
      hasMore: totalReplies > skip + limit,
      total: totalReplies
    });
  } catch (error) {
    console.error('Error fetching thread replies:', error);
    res.status(500).json({ error: 'Error fetching thread replies' });
  }
});

// Index historical messages for Snoopervisor
router.post('/index-historical', auth, async (req, res) => {
  try {
    // Get all messages from public channels and user's DMs
    const messages = await Message.find()
      .populate('sender', 'name')
      .populate({
        path: 'channel',
        populate: {
          path: 'participants'
        }
      });
    
    console.log(`Found ${messages.length} total messages`);
    
    let indexedCount = 0;
    let errorCount = 0;
    const batchSize = 10; // Process 10 messages at a time
    
    // Process messages in batches
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(messages.length / batchSize)}`);
      
      // Process each message in the batch
      await Promise.all(batch.map(async (message) => {
        try {
          console.log(`Indexing message ${message._id} from channel ${message.channel._id}`);
          await messageService.indexMessageForSnoopervisor(message, message.channel);
          indexedCount++;
          console.log(`Successfully indexed message ${message._id}. Total indexed: ${indexedCount}`);
        } catch (error) {
          errorCount++;
          console.error(`Error indexing message ${message._id}:`, error);
        }
      }));
      
      // Add a small delay between batches to prevent overwhelming the service
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between batches
      }
      
      // Send progress update
      const progress = {
        totalMessages: messages.length,
        processedMessages: i + batch.length,
        indexedCount,
        errorCount,
        percentComplete: Math.round(((i + batch.length) / messages.length) * 100)
      };
      console.log('Progress:', progress);
    }
    
    console.log(`Indexing complete. Total messages: ${messages.length}, Indexed: ${indexedCount}, Errors: ${errorCount}`);
    res.json({ 
      success: true, 
      totalMessages: messages.length,
      indexedCount,
      errorCount
    });
  } catch (error) {
    console.error('Error indexing historical messages:', error);
    res.status(500).json({ error: 'Failed to index historical messages' });
  }
});

export default router;
