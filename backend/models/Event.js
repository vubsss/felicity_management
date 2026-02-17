const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['draft', 'published', 'ongoing', 'completed', 'closed'],
        default: 'draft'
    },
    publishedAt: {
        type: Date
    },
    organiserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organiser',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: function () {
            return this.status !== 'draft';
        }
    },
    eventType: {
        type: String,
        enum: ['normal', 'merchandise'],
        required: true
    },
    fee: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        enum: ['tech', 'sports', 'design', 'dance', 'music', 'quiz', 'concert', 'gaming', 'misc'],
        required: function () {
            return this.status !== 'draft';
        }
    },
    eligibility: {
        type: String,
        enum: ['internal', 'external', 'both'],
        required: function () {
            return this.status !== 'draft';
        }
    },
    registrationDeadline: {
        type: Date,
        required: function () {
            return this.status !== 'draft';
        }
    },
    startTime: {
        type: Date,
        required: function () {
            return this.status !== 'draft';
        }
    },
    endTime: {
        type: Date,
        required: function () {
            return this.status !== 'draft';
        }
    },
    regLimit: {
        type: Number,
        required: function () {
            return this.status !== 'draft';
        }
    },
    tags: [{
        type: String
    }],
    customForm: [
        {
            label: { type: String, required: true },
            fieldType: { type: String, required: true },
            required: { type: Boolean, default: false },
            options: [{ type: String }]
        }
    ],
    merchandise: {
        items: [
            {
                name: { type: String, required: true },
                purchaseLimit: { type: Number, default: 1 },
                variants: [
                    {
                        label: { type: String, required: true },
                        stock: { type: Number, required: true }
                    }
                ]
            }
        ]
    }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);