const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    medicalHistory: {
        chronicConditions: [String],
        allergies: [String],
        skinType: { type: String, enum: ['Dry', 'Oily', 'Combination', 'Normal', 'Sensitive'], default: 'Normal' },
        pastIssues: String
    },
    reportMeta: {
        filename: String,
        extractedText: String,
        uploadDate: Date
    },
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
