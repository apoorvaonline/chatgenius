import { Schema, model } from 'mongoose';
import pkg from 'bcryptjs';
const { hash } = pkg;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: {
    type: String,
    enum: ['online', 'away', 'dnd', 'offline'],
    default: 'offline'
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  statusPrivacy: {
    hidden: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    disableAutoChange: { type: Boolean, default: false }
  }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await hash(this.password, 10);
  next();
});

export default model('User', UserSchema);