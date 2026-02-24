const mongoose = require('mongoose');

const forumReactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    emoji: {
        type: String,
        required: true,
        trim: true,
        maxlength: 10
    }
}, { _id: false });

const forumMessageSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    authorUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    authorRole: {
        type: String,
        enum: ['participant', 'organiser', 'admin'],
        required: true
    },
    authorName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    parentMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumMessage',
        default: null,
        index: true
    },
    isPinned: {
        type: Boolean,
        default: false,
        index: true
    },
    isAnnouncement: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reactions: {
        type: [forumReactionSchema],
        default: []
    }
}, { timestamps: true });

forumMessageSchema.index({ eventId: 1, createdAt: 1 });

module.exports = mongoose.model('ForumMessage', forumMessageSchema);
