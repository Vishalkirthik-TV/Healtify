import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    participants: [{
        type: String // Store socket IDs or User IDs if available
    }],
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    transcript: [{
        speaker: String,
        text: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    summary: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active'
    },
    proposedDate: {
        type: String // AI suggested date context
    }
}, { timestamps: true });

export default mongoose.model('Meeting', meetingSchema);
