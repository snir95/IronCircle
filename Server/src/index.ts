import express from 'express';
import type { Express, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js';
import channelRoutes from './routes/channels.js';
import userRoutes from './routes/users.js';
import { auth } from './middleware/auth.js';
import { User } from './models/User.js';
import { Message } from './models/Message.js';

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

// Store connected users and their socket IDs
export const connectedUsers = new Map<string, Set<string>>();

io.on('connection', (socket: AuthenticatedSocket) => {
  // Authenticate user
  socket.on('authenticate', async (token: string) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      const user = await User.findById(decoded.userId);
      
      if (user) {
        const userId = (user as any)._id.toString();
        socket.userId = userId;
        socket.username = user.username;
        
        // Add socket ID to user's connected sockets
        if (!connectedUsers.has(userId)) {
          connectedUsers.set(userId, new Set());
        }
        const userSockets = connectedUsers.get(userId);
        if (userSockets && socket.id) {
          userSockets.add(socket.id);
        }
       
        // Emit current online users to the newly connected user
        const onlineUsers = Array.from(connectedUsers.keys());
        socket.emit('authenticated', { 
          success: true,
          onlineUsers 
        });
        
        // Notify others that this user is online
        socket.broadcast.emit('user_online', { 
          userId: user._id, 
          username: user.username 
        });
      }
    } catch (error) {
      socket.emit('authenticated', { success: false, message: 'Invalid token' });
    }
  });

  // Join channel
  socket.on('join_channel', async (channelId: string) => {
    if (socket.userId) {
      socket.join(`channel_${channelId}`);
    }
  });

  // Leave channel
  socket.on('leave_channel', (channelId: string) => {
    if (socket.userId) {
      socket.leave(`channel_${channelId}`);
    }
  });

  // Send message to channel
  socket.on('send_message', async (data: { 
    channelId: string; 
    content: string; 
    messageType?: 'text' | 'image' | 'video' | 'file',
    fileData?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSize?: number;
  }) => {
    if (!socket.userId) return;

    if (data.fileSize && data.fileSize > 5 * 1024 * 1024) { // 5MB limit
      return socket.emit('message_error', { message: 'File size exceeds 5MB limit.' });
    }

    try {
      const message = new Message({
        content: data.content,
        sender: socket.userId,
        channel: data.channelId,
        messageType: data.fileData ? 'file' : 'text',
        fileData: data.fileData,
        fileName: data.fileName,
        fileMimeType: data.fileMimeType,
        fileSize: data.fileSize,
      });

      await message.save();
      await message.populate('sender', 'username avatar');

      const messageData = {
        _id: message._id,
        content: message.content,
        sender: message.sender,
        channel: message.channel,
        messageType: message.messageType,
        fileData: message.fileData,
        fileName: message.fileName,
        fileMimeType: message.fileMimeType,
        fileSize: message.fileSize,
        createdAt: message.createdAt
      };

      io.to(`channel_${data.channelId}`).emit('new_message', messageData);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });

  // Private message
  socket.on('private_message', async (data: { 
    recipientId: string; 
    content: string;
    messageType?: 'text' | 'image' | 'video' | 'file',
    fileData?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSize?: number;
  }) => {
    if (!socket.userId) return;

    if (data.fileSize && data.fileSize > 5 * 1024 * 1024) { // 5MB limit
      return socket.emit('message_error', { message: 'File size exceeds 5MB limit.' });
    }

    try {
      const message = new Message({
        content: data.content,
        sender: socket.userId,
        recipient: data.recipientId,
        messageType: data.fileData ? 'file' : 'text',
        fileData: data.fileData,
        fileName: data.fileName,
        fileMimeType: data.fileMimeType,
        fileSize: data.fileSize,
      });

      await message.save();
      await message.populate('sender', 'username avatar');

      const messageData = {
        _id: message._id,
        content: message.content,
        sender: message.sender,
        recipient: message.recipient,
        messageType: message.messageType,
        fileData: message.fileData,
        fileName: message.fileName,
        fileMimeType: message.fileMimeType,
        fileSize: message.fileSize,
        createdAt: message.createdAt
      };

      // Send to all recipient's sockets if online
      const recipientSockets = connectedUsers.get(data.recipientId);
      if (recipientSockets) {
        recipientSockets.forEach(socketId => {
          io.to(socketId).emit('private_message', messageData);
        });
      }
      
      // Send back to sender
      socket.emit('private_message', messageData);
    } catch (error) {
      console.error('Error saving private message:', error);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });

  // Delete message
  socket.on('delete_message', async (messageId: string) => {
    if (!socket.userId) return;

    try {
      const message = await Message.findById(messageId);

      if (!message) {
        return socket.emit('message_error', { message: 'Message not found' });
      }

      if (message.sender.toString() !== socket.userId) {
        return socket.emit('message_error', { message: 'You can only delete your own messages' });
      }

      // Soft delete
      message.isDeleted = true;
      message.content = 'This message has been deleted.';
      message.fileData = undefined;
      message.fileName = undefined;
      message.fileMimeType = undefined;
      message.fileSize = undefined;
      await message.save();

      const deletedMessageData = {
        _id: message._id,
        channel: message.channel,
        recipient: message.recipient
      };

      if (message.channel) {
        io.to(`channel_${message.channel}`).emit('message_deleted', deletedMessageData);
      } else if (message.recipient) {
        const recipientSockets = connectedUsers.get(message.recipient.toString());
        if (recipientSockets) {
          recipientSockets.forEach(socketId => {
            io.to(socketId).emit('message_deleted', deletedMessageData);
          });
        }
        socket.emit('message_deleted', deletedMessageData);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('message_error', { message: 'Failed to delete message' });
    }
  });

  // Edit message
  socket.on('edit_message', async ({ messageId, newContent }: { messageId: string, newContent: string }) => {
    if (!socket.userId) return;

    try {
      const message = await Message.findById(messageId);

      if (!message) {
        return socket.emit('message_error', { message: 'Message not found' });
      }

      if (message.sender.toString() !== socket.userId) {
        return socket.emit('message_error', { message: 'You can only edit your own messages' });
      }

      message.content = newContent;
      message.isEdited = true;
      await message.save();
      await message.populate('sender', 'username avatar');

      const editedMessageData = {
        _id: message._id,
        content: message.content,
        sender: message.sender,
        channel: message.channel,
        recipient: message.recipient,
        isEdited: message.isEdited,
        updatedAt: message.updatedAt
      };

      if (message.channel) {
        io.to(`channel_${message.channel}`).emit('message_edited', editedMessageData);
      } else if (message.recipient) {
        const recipientSockets = connectedUsers.get(message.recipient.toString());
        if (recipientSockets) {
          recipientSockets.forEach(socketId => {
            io.to(socketId).emit('message_edited', editedMessageData);
          });
        }
        socket.emit('message_edited', editedMessageData);
      }
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('message_error', { message: 'Failed to edit message' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      // Remove this socket from user's connected sockets
      const userSockets = connectedUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // If no more sockets, user is fully offline
        if (userSockets.size === 0) {
          connectedUsers.delete(socket.userId);
          
          // No need to update anything in DB for online status
          
          // Notify others that user went offline
          io.emit('user_offline', { 
            userId: socket.userId, 
            username: socket.username 
          });
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});