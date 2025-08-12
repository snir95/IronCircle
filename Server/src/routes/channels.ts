import express from 'express';
import { auth } from '../middleware/auth.js';
import { Channel } from '../models/Channel.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

interface AuthRequest extends express.Request {
  user?: any;
}

const router = express.Router();

const isAdmin = (channel: any, userId: any) =>
  channel.admins?.some((id: any) => id.toString() === userId.toString());

// Get all channels the user is a member of and online users
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const [channels, onlineUsers] = await Promise.all([
      Channel.find({
        members: req.user._id
      }).populate('createdBy', 'username'),
      User.find({ isOnline: true }, 'username isOnline')
    ]);
    
    res.json({
      channels,
      onlineUsers: onlineUsers.map(user => (user as any)._id.toString())
    });
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

// Get channel messages (with optional search q)
router.get('/:channelId/messages', auth, async (req: AuthRequest, res) => {
  try {
    const { channelId } = req.params;
    const { q } = req.query as { q?: string };
    
    // Check if user is member of the channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    
    if (channel.isPrivate && !channel.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const filter: any = { channel: channelId };
    if (q && typeof q === 'string') {
      filter.content = { $regex: q, $options: 'i' };
    }

    const messages = await Message.find(filter)
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

// Update channel metadata (name, description) - admins only
router.put('/:channelId', auth, async (req: AuthRequest, res) => {
  try {
    const { channelId } = req.params;
    const { name, description } = req.body as { name?: string; description?: string };

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (!isAdmin(channel, req.user._id)) return res.status(403).json({ message: 'Admin only' });

    if (typeof name === 'string') channel.name = name;
    if (typeof description === 'string') channel.description = description;
    await channel.save();
    res.json(channel);
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Invite user to channel (admin only)
router.post('/:channelId/invite', auth, async (req: AuthRequest, res) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body as { userId: string };
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (!isAdmin(channel, req.user._id)) return res.status(403).json({ message: 'Admin only' });

    if (!channel.members.some((id: any) => id.toString() === userId)) {
      channel.members.push(userId as any);
      await channel.save();
    }
    res.json({ message: 'User invited/added' });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Modify admins (add/remove) - admin only
router.post('/:channelId/admins', auth, async (req: AuthRequest, res) => {
  try {
    const { channelId } = req.params;
    const { userId, action } = req.body as { userId: string; action: 'add' | 'remove' };
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (!isAdmin(channel, req.user._id)) return res.status(403).json({ message: 'Admin only' });

    if (action === 'add') {
      if (!channel.admins.some((id: any) => id.toString() === userId)) {
        channel.admins.push(userId as any);
      }
    } else if (action === 'remove') {
      channel.admins = channel.admins.filter((id: any) => id.toString() !== userId);
    }
    await channel.save();
    res.json(channel);
  } catch (error) {
    console.error('Error modifying admins:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member - admin only
router.delete('/:channelId/members/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { channelId, userId } = req.params as { channelId: string; userId: string };
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (!isAdmin(channel, req.user._id)) return res.status(403).json({ message: 'Admin only' });

    channel.members = channel.members.filter((id: any) => id.toString() !== userId);
    channel.admins = channel.admins.filter((id: any) => id.toString() !== userId);
    await channel.save();
    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search public channels not joined by current user
router.get('/search/public', auth, async (req: AuthRequest, res) => {
  try {
    const { q } = req.query as { q?: string };
    const criteria: any = {
      isPrivate: false,
      members: { $ne: req.user._id }
    };
    if (q && typeof q === 'string') {
      criteria.name = { $regex: q, $options: 'i' };
    }
    const channels = await Channel.find(criteria).select('name description isPrivate');
    res.json(channels);
  } catch (error) {
    console.error('Error searching channels:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get channel members (populated) and admin ids
router.get('/:channelId/members', auth, async (req: AuthRequest, res) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId).populate('members', 'username avatar');
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    // Ensure requester is a member to view member list
    if (!channel.members.some((m: any) => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      members: channel.members,
      admins: channel.admins?.map((id: any) => id.toString()) || []
    });
  } catch (error) {
    console.error('Error fetching channel members:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
