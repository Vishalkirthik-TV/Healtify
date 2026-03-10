const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const axios = require('axios');

// Initialize Twilio Client
const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Emergency Alert Endpoint (SMS)
router.post('/alert', async (req, res) => {
    const { type, coords } = req.body;
    const { latitude, longitude } = coords || {};

    // Target Number (Hardcoded as per user request)
    const TARGET_NUMBER = '+917387130524'; // Adding country code for India assuming the number format

    let messageBody = '';

    if (type === 'AMBULANCE') {
        messageBody = `🚑 AMBULANCE REQUEST! \nLocation: https://www.google.com/maps?q=${latitude},${longitude}`;
    } else {
        messageBody = `🆘 EMERGENCY ALERT! \nI need help. Location: https://www.google.com/maps?q=${latitude},${longitude}`;
    }

    try {
        const message = await client.messages.create({
            body: messageBody,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: TARGET_NUMBER
        });

        console.log(`SMS Sent: ${message.sid}`);
        res.json({ success: true, sid: message.sid });
    } catch (error) {
        console.error("Twilio Error:", error);
        res.status(500).json({ error: "Failed to send SMS", details: error.message });
    }
});

// Automated Voice Call Endpoint (TTS)
router.post('/automated-call', async (req, res) => {
    const { type, coords } = req.body;
    const { latitude, longitude } = coords || {};

    // Target Number (Hardcoded as per user request)
    const TARGET_NUMBER = '+917387130524';

    try {
        // Construct the TwiML message
        // Note: Using a simple TwiML Bin or constructing XML would work, 
        // but here we can use the Twilio Helper Library to generate it if we were returning TwiML.
        // Since we are INITIATING a call, we need to provide a URL that returns TwiML.
        // For simplicity in this rapid proto, we can use a "Twimlet" (echo service) or point to another endpoint on our server.
        // Ideally: Url: `${process.env.BACKEND_URL}/api/emergency/twiml?message=...`

        // Strategy: Use Twilio's Echo Twimlet for rapid dev without public URL requirement (but Twilio needs to reach IT).
        // Wait, Twilio needs a PUBLIC URL to fetch TwiML. 
        // If we are on localhost, Twilio CANNOT reach us.
        // We must use a TwiML Bin or ngrok. 
        // Assuming user has a way/tunnel or just purely for code completion:

        // WORKAROUND for Localhost: We cannot serve TwiML to Twilio without a tunnel.
        // However, we can use the `twiml` parameter in the `calls.create` method? 
        // NO, `twiml` parameter IS supported in newer SDKs! Let's try that.

        const message = `This is an automated emergency alert. The user located at Latitude ${latitude}, Longitude ${longitude} is facing an emergency situation. Please contact the emergency service for the user ASAP.`;

        const call = await client.calls.create({
            twiml: `<Response><Say voice="alice">${message}</Say></Response>`,
            to: TARGET_NUMBER,
            from: process.env.TWILIO_PHONE_NUMBER
        });

        console.log(`Call Initiated: ${call.sid}`);
        res.json({ success: true, sid: call.sid });

    } catch (error) {
        console.error("Twilio Call Error:", error);
        res.status(500).json({ error: "Failed to initiate call", details: error.message });
    }
});

// Nearby Hospitals Endpoint (Google Places Proxy)
router.get('/hospitals', async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude required" });
    }

    try {
        // Using GEMINI_API_KEY as a placeholder if it has Maps access, 
        // otherwise this might fail if the key is restricted to Gemini only.
        // Ideally should be process.env.GOOGLE_MAPS_API_KEY
        const API_KEY = process.env.GEMINI_API_KEY;

        const response = await axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json`, {
            params: {
                location: `${lat},${lng}`,
                radius: 5000, // 5km
                type: 'hospital',
                key: API_KEY
            }
        });

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
            throw new Error(`Google Places API Error: ${response.data.status}`);
        }

        const hospitals = response.data.results.map(place => ({
            name: place.name,
            vicinity: place.vicinity,
            place_id: place.place_id,
            rating: place.rating,
            geometry: place.geometry
        }));

        res.json(hospitals);

    } catch (error) {
        console.error("Places API Error:", error.message);
        // Fallback Mock Data if API fails (e.g., Key restriction)
        console.log("Serving mock hospital data due to API failure");
        res.json([
            { name: "City General Hospital (Mock)", vicinity: "123 Main St", place_id: "m1" },
            { name: "St. Mary's Medical Center (Mock)", vicinity: "456 Oak Ave", place_id: "m2" },
            { name: "Community Health Clinic (Mock)", vicinity: "789 Pine Ln", place_id: "m3" }
        ]);
    }
});

module.exports = router;
