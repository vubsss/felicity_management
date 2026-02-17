const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ['admin', 'participant', 'organiser'],
        default: 'participant'
    }}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
