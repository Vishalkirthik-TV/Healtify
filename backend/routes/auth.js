const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const multer = require('multer');
const pdf = require('pdf-parse');
const upload = multer({ storage: multer.memoryStorage() });

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: "User already exists" });

        user = new User({ name, email, password });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during registration" });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, medicalHistory: user.medicalHistory } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during login" });
    }
});

// Get User Profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "No token, authorization denied" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(401).json({ error: "Token is not valid" });
    }
});

// Update Medical History
router.post('/profile/medical-history', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "No token, authorization denied" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { medicalHistory } = req.body;

        const user = await User.findByIdAndUpdate(
            decoded.id,
            { medicalHistory },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update medical history" });
    }
});

// Upload and Parse Medical Report (PDF)
router.post('/upload-report', upload.single('report'), async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "No token, authorization denied" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Parse PDF
        const data = await pdf(req.file.buffer);
        const extractedText = data.text;

        const user = await User.findByIdAndUpdate(
            decoded.id,
            {
                reportMeta: {
                    filename: req.file.originalname,
                    extractedText: extractedText,
                    uploadDate: new Date()
                }
            },
            { new: true }
        ).select('-password');

        res.json({
            message: "Report uploaded and processed successfully",
            user,
            extractedPreview: extractedText.substring(0, 500) // Send a preview of what was found
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to process PDF report" });
    }
});

module.exports = router;
