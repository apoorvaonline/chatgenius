import express from 'express';
import Channel from '../models/Channel.js';
import auth from './auth.js';

const router = express.Router();

// Create a new channel
router.post('/', auth, async (req, res) => {
  try {
    const { name, isDM, participants } = req.body;
    
    if (isDM) {
      // Check if DM channel already exists
      const existingChannel = await Channel.findOne({
        isDM: true,
        participants: { $all: participants }
      });
      
      if (existingChannel) {
        return res.json(existingChannel);
      }
    }
    
    const channel = new Channel({
      name,
      isDM: isDM || false,
      participants: participants || [req.user.id]
    });
    
    await channel.save();
    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Error creating channel' });
  }
});

// Get all channels
router.get('/', async (req, res) => {
  try {
    // Fetch channels where isDM is false or not set
    const channels = await Channel.find({ $or: [{ isDM: false }, { isDM: { $exists: false } }] }).populate('participants', 'name email');
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific channel
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const channel = await Channel.findById(id).populate('participants', 'name email');
    if (!channel) return res.status(404).send('Channel not found');
    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get DM channel between two users
router.get('/dm/:userId1/:userId2', auth, async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const channel = await Channel.findOne({
      isDM: true,
      participants: { $all: [userId1, userId2] }
    });
    res.json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching DM channel' });
  }
});

export default router;
