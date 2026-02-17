const mongoose = require('mongoose');

const organiserSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['tech','sports','design','dance','music','quiz','concert','gaming','misc'],
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    contactEmail: {
        type: String,
        default: ''
    },
    contactNumber: {
        type: String,
        default: ''
    },
    discordWebhook: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'disabled', 'archived'],
        default: 'active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Organiser', organiserSchema);