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
    }}, { timestamps: true });

module.exports = mongoose.model('Organiser', organiserSchema);