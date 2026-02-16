const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
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
    type: {
        type: String,
        enum: ['normal', 'merchandise'],
        required: true
    },
    status: {
        type: String,
        enum: ['registered', 'purchased', 'cancelled'],
        default: 'registered'
    },
    attendance: {
        type: Boolean,
        default: false
    },
    teamCompleted: {
        type: Boolean,
        default: false
    },
    formData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    orderItems: [
        {
            itemName: { type: String },
            variantLabel: { type: String },
            quantity: { type: Number, default: 1 }
        }
    ],
    ticketId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    }
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
