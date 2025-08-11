
import express from 'express';
import type { Express, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import channelRoutes from './routes/channels.js';
import userRoutes from './routes/users.js';
import { auth } from './middleware/auth.js';
import { User } from './models/User.js';
import { Message } from './models/Message.js';
import { Channel } from './models/Channel.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

dotenv.config();

const app: Express = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/ironcircle';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:8080", 
    methods: ["GET", "POST"]
  }
});

const PORT: number | string = process.env.PORT || 3001;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', auth, channelRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('<h1>Chat Server is running (TypeScript)</h1>');
});

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket: AuthenticatedSocket) => {
  console.log('A user connected with socket ID:', socket.id);

  // Authenticate user
  socket.on('authenticate', async (token: string) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      const user = await User.findById(decoded.userId);
      
      if (user) {
        socket.userId = (user as any)._id.toString();
        socket.username = user.username;
        connectedUsers.set(socket.userId, socket.id);
        
        // Update user online status
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        
        socket.emit('authenticated', { success: true });
        io.emit('user_online', { userId: user._id, username: user.username });
      }
    } catch (error) {
      socket.emit('authenticated', { success: false, message: 'Invalid token' });
    }
  });

  // Join channel
  socket.on('join_channel', async (channelId: string) => {
    if (socket.userId) {
      socket.join(`channel_${channelId}`);
      console.log(`User ${socket.username} joined channel ${channelId}`);
    }
  });

  // Leave channel
  socket.on('leave_channel', (channelId: string) => {
    if (socket.userId) {
      socket.leave(`channel_${channelId}`);
      console.log(`User ${socket.username} left channel ${channelId}`);
    }
  });

  // Send message to channel
  socket.on('send_message', async (data: { channelId: string; content: string; messageType?: string }) => {
    if (!socket.userId) return;

    try {
      const message = new Message({
        content: data.content,
        sender: socket.userId,
        channel: data.channelId,
        messageType: data.messageType || 'text'
      });

      await message.save();
      await message.populate('sender', 'username avatar');

      const messageData = {
        _id: message._id,
        content: message.content,
        sender: message.sender,
        channel: message.channel,
        messageType: message.messageType,
        createdAt: message.createdAt
      };

      io.to(`channel_${data.channelId}`).emit('new_message', messageData);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });

  // Private message
  socket.on('private_message', async (data: { recipientId: string; content: string }) => {
    if (!socket.userId) return;

    try {
      const message = new Message({
        content: data.content,
        sender: socket.userId,
        recipient: data.recipientId,
        messageType: 'text'
      });

      await message.save();
      await message.populate('sender', 'username avatar');

      const messageData = {
        _id: message._id,
        content: message.content,
        sender: message.sender,
        recipient: message.recipient,
        messageType: message.messageType,
        createdAt: message.createdAt
      };

      // Send to recipient if online
      const recipientSocketId = connectedUsers.get(data.recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('private_message', messageData);
      }
      
      // Send back to sender
      socket.emit('private_message', messageData);
    } catch (error) {
      console.error('Error saving private message:', error);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing', (data: { channelId: string; isTyping: boolean }) => {
    if (socket.userId) {
      socket.to(`channel_${data.channelId}`).emit('user_typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping: data.isTyping
      });
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      
      // Update user offline status
      try {
        const user = await User.findById(socket.userId);
        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          await user.save();
          
          io.emit('user_offline', { userId: user._id, username: user.username });
        }
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});