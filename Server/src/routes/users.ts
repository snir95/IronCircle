import express from 'express';
import { auth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';

interface AuthRequest extends express.Request {
  user?: any;
}

const router = express.Router();

// Get all users (excluding current user)
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('username avatar isOnline lastSeen')
      .sort({ username: 1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get private messages between current user and another user
router.get('/:userId/messages', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { q } = req.query as { q?: string };
    
    const filter: any = {
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ]
    };

    if (q && typeof q === 'string') {
      filter.content = { $regex: q, $options: 'i' };
    }

    const messages = await Message.find(filter)
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Error fetching private messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
