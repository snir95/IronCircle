import mongoose from 'mongoose';

export interface IMessage extends mongoose.Document {
  content: string;
  sender: mongoose.Types.ObjectId;
  channel?: mongoose.Types.ObjectId;
  recipient?: mongoose.Types.ObjectId;
  messageType: 'text' | 'image' | 'video' | 'file';
  fileData?: string;
  fileMimeType?: string;
  fileName?: string;
  fileSize?: number;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  // These are automatically handled by Mongoose with timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new mongoose.Schema<IMessage>({
  content: {
    type: String,
    required: false,
    trim: true,
    maxlength: 2000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'file'],
    default: 'text'
  },
  fileData: {
    type: String
  },
  fileMimeType: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ content: 'text' }); // For text search

export const Message = mongoose.model<IMessage>('Message', messageSchema);
