const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
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
    participantType: {
        type: String,
        enum: ['internal', 'external'],
        required: true
    },
    organisation: {
        type: String
    },
    contactNumber: {
        type: String,
        required: true
    },
    interests: {
        type: [
            {
                type: String,
                enum: ['tech', 'sports', 'design', 'dance', 'music', 'quiz', 'concert', 'gaming', 'misc']
            }
        ],
        default: []
    },
    followedOrganisers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Organiser',
        default: []
    },
    onboardingCompleted: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Participant', participantSchema);
