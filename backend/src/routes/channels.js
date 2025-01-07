import express from 'express';
import Channel from '../models/Channel.js';

const router = express.Router();

// Create a new channel
router.post('/', async (req, res) => {
  const { name, participants } = req.body;
  try {
    const channel = new Channel({ name, participants });
    await channel.save();
    res.status(201).json(channel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all channels
router.get('/', async (req, res) => {
  try {
    const channels = await Channel.find().populate('participants', 'name email');
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

export default router;
