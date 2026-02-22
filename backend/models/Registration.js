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
        enum: ['registered', 'pending_payment', 'pending_approval', 'successful', 'cancelled', 'rejected'],
        default: 'registered'
    },
    paymentStatus: {
        type: String,
        enum: ['not_required', 'not_submitted', 'pending', 'approved', 'rejected'],
        default: 'not_required'
    },
    paymentProof: {
        filename: { type: String },
        mimetype: { type: String },
        size: { type: Number },
        buffer: { type: String },
        uploadedAt: { type: Date }
    },
    paymentReview: {
        reviewedAt: { type: Date },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organiser'
        },
        note: { type: String }
    },
    attendance: {
        type: Boolean,
        default: false
    },
    attendanceMarkedAt: {
        type: Date,
        default: null
    },
    attendanceMethod: {
        type: String,
        enum: ['scan', 'manual', null],
        default: null
    },
    attendanceMarkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organiser',
        default: null
    },
    attendanceLogs: [
        {
            action: {
                type: String,
                enum: ['scan_success', 'scan_duplicate', 'manual_override'],
                required: true
            },
            at: {
                type: Date,
                default: Date.now
            },
            by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Organiser'
            },
            method: {
                type: String,
                enum: ['scan', 'manual'],
                required: true
            },
            note: {
                type: String
            }
        }
    ],
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
