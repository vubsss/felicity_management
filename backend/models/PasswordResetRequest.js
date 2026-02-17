const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
    organiserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organiser',
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'resolved'],
        default: 'open'
    },
    resolvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
