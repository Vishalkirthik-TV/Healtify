import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { issueJwt, requireAuth } from '../middleware/auth.js';
import admin from '../config/firebaseAdmin.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = issueJwt(user);

    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Handle case where user exists but only has Firebase auth (no password hash)
    if (!user.passwordHash) {
      return res.status(401).json({ message: 'Please sign in using the provider you registered with (e.g., Google/Firebase).' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = issueJwt(user);
    res.json({ user: { id: user._id, name: user.name, email: user.email }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/firebase - Login/Register with Firebase ID Token
router.post('/firebase', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Missing ID token' });

    // Verify the ID token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture, uid } = decodedToken;

    if (!email) return res.status(400).json({ message: 'Firebase user must have an email' });

    // Check if user exists in MongoDB
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user from Firebase details
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        avatar: picture,
        firebaseUid: uid,
        isFirebaseUser: true
      });
      console.log(`Created new user from Firebase: ${user.email}`);
    } else {
      // Update existing user with Firebase UID if not set
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        user.isFirebaseUser = true;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
        console.log(`Linked existing user to Firebase: ${user.email}`);
      }
    }

    // Issue our app's JWT
    const token = issueJwt(user);
    res.json({
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
      token
    });

  } catch (err) {
    console.error('Firebase Auth Error:', err);
    res.status(401).json({ message: 'Invalid or expired token', error: err.message });
  }
});

// GET /api/auth/me - Get current user details
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash'); // Exclude password hash
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;


