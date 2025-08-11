import express from 'express';
import { auth } from '../middleware/auth.js';
import { Channel } from '../models/Channel.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

interface AuthRequest extends express.Request {
  user?: any;
}

const router = express.Router();

// Get all channels (public channels and private channels user is member of)
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const channels = await Channel.find({
      $or: [
        { isPrivate: false },
        { members: req.user._id }
      ]
    }).populate('createdBy', 'username');
    
    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new channel
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    const channel = new Channel({
      name,
      description,
      isPrivate: isPrivate || false,
      createdBy: req.user._id,
      members: [req.user._id],
      admins: [req.user._id]
    });
    
    await channel.save();
    await channel.populate('createdBy', 'username');
    
    res.status(201).json(channel);
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get channel messages
router.get('/:channelId/messages', auth, async (req: AuthRequest, res) => {
  try {
    const { channelId } = req.params;
    
    // Check if user is member of the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    if (channel.isPrivate && !channel.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const messages = await Message.find({ channel: channelId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a channel
router.post('/:channelId/join', auth, async (req: AuthRequest, res) => {
  try {
    const { channelId } = req.params;
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    if (channel.isPrivate) {
      return res.status(403).json({ message: 'Cannot join private channel' });
    }
    
    if (channel.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member of this channel' });
    }
    
    channel.members.push(req.user._id);
    await channel.save();
    
    res.json({ message: 'Successfully joined channel' });
  } catch (error) {
    console.error('Error joining channel:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave a channel
router.post('/:channelId/leave', auth, async (req: AuthRequest, res) => {
  try {
    const { channelId } = req.params;
    
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    if (!channel.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Not a member of this channel' });
    }
    
    channel.members = channel.members.filter(member => member.toString() !== req.user._id.toString());
    channel.admins = channel.admins.filter(admin => admin.toString() !== req.user._id.toString());
    
    await channel.save();
    
    res.json({ message: 'Successfully left channel' });
  } catch (error) {
    console.error('Error leaving channel:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
