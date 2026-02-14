import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: false }, // Optional for Firebase users
    firebaseUid: { type: String, unique: true, sparse: true }, // Sparse index allows null/undefined
    avatar: { type: String },
    isFirebaseUser: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
