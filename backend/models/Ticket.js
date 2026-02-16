const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Participant',
        required: true
    },
    ticketCode: {
        type: String,
        unique: true,
        required: true
    },
    qrData: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'cancelled'],
        default: 'active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
