import express from 'express';
import User from '../models/User.js';
import auth from './auth.js';

const router = express.Router();

// Update user status
router.put('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    user.lastActive = new Date();
    await user.save();

    // Emit status change via Socket.IO
    req.app.get('io').emit('userStatusChange', {
      userId: user._id,
      status: user.status
    });

    res.json({ status: user.status });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status' });
  }
});

// Update status privacy settings
router.put('/status-privacy', auth, async (req, res) => {
  try {
    const { hiddenFrom, disableAutoChange } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (hiddenFrom) user.statusPrivacy.hidden = hiddenFrom;
    if (typeof disableAutoChange === 'boolean') {
      user.statusPrivacy.disableAutoChange = disableAutoChange;
    }

    await user.save();
    res.json({ message: 'Privacy settings updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating privacy settings' });
  }
});

// Get all users
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({}, { 
      password: 0,
      name: 1,
      email: 1,
      status: 1,
      lastActive: 1
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

export default router; 