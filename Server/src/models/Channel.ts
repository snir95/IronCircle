import mongoose from 'mongoose';

export interface IChannel extends mongoose.Document {
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  // These are automatically handled by Mongoose with timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new mongoose.Schema<IChannel>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for faster queries
channelSchema.index({ name: 1 });
channelSchema.index({ isPrivate: 1 });
channelSchema.index({ members: 1 });

export const Channel = mongoose.model<IChannel>('Channel', channelSchema);
