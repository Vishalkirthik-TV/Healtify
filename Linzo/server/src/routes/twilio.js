import { Router } from 'express';
import twilio from 'twilio';
import { CallLog } from '../models/CallLog.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// In-memory store for mapping Call SIDs to user/room info
// Structure: { callSid: { userId, roomId, phoneNumber } }
const activeCallMap = new Map();

// Use environment variables or fallback to provided credentials (for development)
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_NUMBER = process.env.TWILIO_PHONE_NUMBER
const TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID
const API_KEY_SID = process.env.TWILIO_API_KEY_SID
const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

// GET /api/twilio/token - Generate capability token for client
router.get('/token', requireAuth, (req, res) => {
    try {
        const identity = req.user.username || 'user';

        const accessToken = new twilio.jwt.AccessToken(
            ACCOUNT_SID,
            API_KEY_SID,
            API_KEY_SECRET,
            { identity: identity }
        );

        const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
            outgoingApplicationSid: TWIML_APP_SID,
            incomingAllow: true, // Allow incoming calls
        });

        accessToken.addGrant(voiceGrant);

        const token = accessToken.toJwt();
        console.log(`📞 Generated Twilio token for ${identity}`);

        res.json({
            token: token,
            identity: identity,
            twilioNumber: TWILIO_NUMBER
        });
    } catch (error) {
        console.error('Error generating Twilio token:', error);
        res.status(500).json({ message: 'Failed to generate token' });
    }
});

// POST /api/twilio/voice - TwiML webhook for outbound calls
router.post('/voice', (req, res) => {
    const { To, From, CallSid } = req.body;
    console.log(`📞 Voice webhook triggered: From ${From} to ${To}, CallSid: ${CallSid}`);
    console.log('Webhook Body:', req.body); // Detailed log

    const voiceResponse = new VoiceResponse();

    // Start real-time transcription for the callee's speech (outbound_track)
    // This captures what the person being called says, which is what the deaf/mute user needs
    const start = voiceResponse.start();
    start.transcription({
        name: `transcription-${CallSid}`,
        track: 'outbound_track', // Capture callee's speech
        statusCallbackUrl: `${process.env.SERVER_URL || 'https://your-server-url.com'}/api/twilio/transcription-callback`,
        statusCallbackMethod: 'POST'
    });

    const dial = voiceResponse.dial({
        callerId: TWILIO_NUMBER,
        answerOnBridge: true
    });

    // Check if it's a valid phone number
    if (To && /^[+\d]+$/.test(To)) {
        dial.number(To);
    } else {
        // Client-to-client call (if using client identifiers)
        dial.client(To);
    }

    res.type('text/xml');
    res.send(voiceResponse.toString());
});

// GET /api/twilio/voice - Debug TwiML generation (browser view)
router.get('/voice', (req, res) => {
    const voiceResponse = new VoiceResponse();
    voiceResponse.say('Welcome to Linzo Meet. This is a debug message.');
    res.type('text/xml');
    res.send(voiceResponse.toString());
});

// GET /api/twilio/logs - Get call logs for user
router.get('/logs', requireAuth, async (req, res) => {
    try {
        const logs = await CallLog.find({ user: req.user._id })
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching call logs:', error);
        res.status(500).json({ message: 'Failed to fetch logs' });
    }
});

// POST /api/twilio/logs - Save a new call log
router.post('/logs', requireAuth, async (req, res) => {
    try {
        const { recipientNumber, direction, status, duration, sid } = req.body;

        const log = new CallLog({
            user: req.user._id,
            recipientNumber,
            direction,
            status,
            duration,
            sid
        });

        await log.save();
        console.log(`📝 Logged call to ${recipientNumber} (${duration}s)`);
        res.status(201).json(log);
    } catch (error) {
        console.error('Error saving call log:', error);
        res.status(500).json({ message: 'Failed to save log' });
    }
});

// POST /api/twilio/transcription-callback - Receive real-time transcription updates
router.post('/transcription-callback', (req, res) => {
    console.log(`📝 Transcription callback received from Twilio`);

    // The logs showed: "TranscriptionEvent": "transcription-content" and "TranscriptionData": "{\"transcript\":\"Hello\"...}"
    const { CallSid, TranscriptionEvent, TranscriptionData } = req.body;
    let text = '';

    // Handle Real-time <Stream> transcription events
    if (TranscriptionEvent === 'transcription-content' && TranscriptionData) {
        try {
            const data = JSON.parse(TranscriptionData);
            text = data.transcript;
            console.log(`🔍 Real-time Transcript: "${text}" (Confidence: ${data.confidence})`);
        } catch (e) {
            console.error('❌ Failed to parse TranscriptionData:', e);
        }
    }
    // Fallback for standard <Transcription> status callback (Legacy)
    else if (req.body.TranscriptionStatus === 'completed') {
        text = req.body.TranscriptionText;
    }

    if (text && text.trim()) {
        console.log(`💬 Processing text for avatar: "${text}"`);

        // Get call info from our mapping
        const callInfo = activeCallMap.get(CallSid);

        if (callInfo) {
            const io = req.io;
            if (io) {
                console.log(`🚀 Broadcasting transcription to room`);
                io.emit('twilio-transcription', {
                    callSid: CallSid,
                    text: text.trim(),
                    phoneNumber: callInfo.phoneNumber,
                    timestamp: Date.now()
                });
                console.log(`✅ Transcription broadcast complete`);
            } else {
                console.error('❌ Socket.IO not available on request object');
            }
        } else {
            // Broadcast even without call info map (resilience)
            const io = req.io;
            if (io) {
                io.emit('twilio-transcription', {
                    callSid: CallSid,
                    text: text.trim(),
                    phoneNumber: 'Unknown',
                    timestamp: Date.now()
                });
            }
            console.log(`⚠️ No call info found for CallSid: ${CallSid}, but broadcasted anyway.`);
        }
    }

    res.sendStatus(200);
});

// POST /api/twilio/call-started - Track when a call starts (called from frontend)
router.post('/call-started', requireAuth, (req, res) => {
    try {
        const { callSid, phoneNumber, roomId } = req.body;

        if (!callSid || !phoneNumber) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Store call mapping
        activeCallMap.set(callSid, {
            userId: req.user._id.toString(),
            phoneNumber,
            roomId: roomId || null,
            startTime: Date.now()
        });

        console.log(`📞 Call started - SID: ${callSid}, User: ${req.user.username}, Phone: ${phoneNumber}`);
        console.log(`📊 Active calls: ${activeCallMap.size}`);

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking call start:', error);
        res.status(500).json({ message: 'Failed to track call' });
    }
});

// POST /api/twilio/call-ended - Clean up when a call ends (called from frontend)
router.post('/call-ended', requireAuth, (req, res) => {
    try {
        const { callSid } = req.body;

        if (callSid && activeCallMap.has(callSid)) {
            activeCallMap.delete(callSid);
            console.log(`📞 Call ended - SID: ${callSid}`);
            console.log(`📊 Active calls: ${activeCallMap.size}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking call end:', error);
        res.status(500).json({ message: 'Failed to track call end' });
    }
});

export default router;
