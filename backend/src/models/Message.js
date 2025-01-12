import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isThreadParent: {
    type: Boolean,
    default: false
  },
  parentMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  threadReplyCount: {
    type: Number,
    default: 0
  },
  lastReplyTimestamp: {
    type: Date
  },
  file: {
    url: String,
    filename: String,
    contentType: String,
    size: Number,
    key: String
  },
  reactions: [{
    emoji: String,
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }]
});

export default mongoose.model('Message', messageSchema);
