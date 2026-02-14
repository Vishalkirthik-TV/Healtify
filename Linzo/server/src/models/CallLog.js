import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipientNumber: {
        type: String,
        required: true
    },
    direction: {
        type: String, // 'outbound' or 'inbound'
        default: 'outbound'
    },
    status: {
        type: String, // 'completed', 'failed', 'busy', 'no-answer', 'canceled'
        default: 'completed'
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    sid: {
        type: String
    },
    transcription: {
        type: [String], // Array of transcript fragments
        default: []
    }
});

// Index for efficient querying of a user's history
callLogSchema.index({ user: 1, timestamp: -1 });

export const CallLog = mongoose.model('CallLog', callLogSchema);
