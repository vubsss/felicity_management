const mongoose = require('mongoose');

const organiserSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['normal', 'merchandise'],
        required: true
    }}, { timestamps: true });

module.exports = mongoose.model('Organiser', organiserSchema);