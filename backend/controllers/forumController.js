const { z } = require('zod');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const Organiser = require('../models/Organiser');
const Registration = require('../models/Registration');
const User = require('../models/User');
const ForumMessage = require('../models/ForumMessage');
const { emitForumEvent } = require('../utils/socket');

const allowedReactions = ['👍', '❤️', '🎉', '👏', '❓'];

const createMessageSchema = z.object({
    content: z.string().trim().min(1).max(2000),
    parentMessageId: z.string().optional(),
    isAnnouncement: z.boolean().optional()
});

const reactSchema = z.object({
    emoji: z.enum(allowedReactions)
});

const toIdString = (value) => String(value);

const getDisplayName = async (userId, role) => {
    if (role === 'participant') {
        const participant = await Participant.findOne({ userId }).select('firstName lastName').lean();
        if (participant) {
            return `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || 'Participant';
        }
        return 'Participant';
    }

    if (role === 'organiser') {
        const organiser = await Organiser.findOne({ userId }).select('name').lean();
        return organiser?.name || 'Organiser';
    }

    const user = await User.findById(userId).select('email').lean();
    return user?.email || 'Admin';
};

const getAccessContext = async ({ user, eventId }) => {
    let event = null;
    let canModerate = false;
    let canAnnounce = false;
    let canParticipate = false;

    if (user.role === 'organiser') {
        const organiser = await Organiser.findOne({ userId: user.userId }).select('_id').lean();
        if (!organiser) {
            return { ok: false, status: 404, message: 'Organiser not found' };
        }
        event = await Event.findOne({ _id: eventId, organiserId: organiser._id }).lean();
        if (!event) {
            return { ok: false, status: 404, message: 'Event not found' };
        }
        canModerate = true;
        canAnnounce = true;
        canParticipate = true;
    } else if (user.role === 'participant') {
        event = await Event.findOne({ _id: eventId, status: { $ne: 'draft' } }).lean();
        if (!event) {
            return { ok: false, status: 404, message: 'Event not found' };
        }
        const participant = await Participant.findOne({ userId: user.userId }).select('_id').lean();
        if (!participant) {
            return { ok: false, status: 404, message: 'Participant not found' };
        }
        const registration = await Registration.findOne({
            eventId,
            participantId: participant._id,
            status: { $nin: ['cancelled', 'rejected'] }
        }).select('_id').lean();
        canParticipate = Boolean(registration);
    } else {
        event = await Event.findById(eventId).lean();
        if (!event) {
            return { ok: false, status: 404, message: 'Event not found' };
        }
        canParticipate = true;
    }

    return {
        ok: true,
        event,
        canModerate,
        canAnnounce,
        canParticipate
    };
};

const serializeMessage = (message, currentUserId) => {
    const reactionSummary = allowedReactions.map((emoji) => {
        const users = (message.reactions || []).filter((reaction) => reaction.emoji === emoji).map((reaction) => toIdString(reaction.userId));
        return {
            emoji,
            count: users.length,
            reacted: users.includes(toIdString(currentUserId))
        };
    }).filter((item) => item.count > 0 || ['👍', '❤️'].includes(item.emoji));

    return {
        id: toIdString(message._id),
        eventId: toIdString(message.eventId),
        authorUserId: toIdString(message.authorUserId),
        authorRole: message.authorRole,
        authorName: message.authorName,
        content: message.isDeleted ? 'This message was removed by an organizer.' : message.content,
        isPinned: Boolean(message.isPinned),
        isAnnouncement: Boolean(message.isAnnouncement),
        isDeleted: Boolean(message.isDeleted),
        parentMessageId: message.parentMessageId ? toIdString(message.parentMessageId) : null,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        reactions: reactionSummary
    };
};

const listMessages = async (req, res, next) => {
    try {
        const access = await getAccessContext({ user: req.user, eventId: req.params.id });
        if (!access.ok) {
            return res.status(access.status).json({ message: access.message });
        }

        const messages = await ForumMessage.find({ eventId: req.params.id })
            .sort({ isPinned: -1, createdAt: 1 })
            .lean();

        return res.json({
            messages: messages.map((message) => serializeMessage(message, req.user.userId)),
            permissions: {
                canModerate: access.canModerate,
                canAnnounce: access.canAnnounce,
                canParticipate: access.canParticipate
            },
            allowedReactions
        });
    } catch (error) {
        return next(error);
    }
};

const createMessage = async (req, res, next) => {
    const parsed = createMessageSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid message payload' });
    }

    try {
        const access = await getAccessContext({ user: req.user, eventId: req.params.id });
        if (!access.ok) {
            return res.status(access.status).json({ message: access.message });
        }
        if (!access.canParticipate) {
            return res.status(403).json({ message: 'Only registered participants can post in this forum' });
        }

        const parentMessageId = parsed.data.parentMessageId || null;
        if (parentMessageId) {
            const parent = await ForumMessage.findOne({ _id: parentMessageId, eventId: req.params.id }).select('_id').lean();
            if (!parent) {
                return res.status(404).json({ message: 'Parent message not found' });
            }
        }

        const isAnnouncement = Boolean(parsed.data.isAnnouncement);
        if (isAnnouncement && !access.canAnnounce) {
            return res.status(403).json({ message: 'Only event organizers can post announcements' });
        }

        const authorName = await getDisplayName(req.user.userId, req.user.role);

        const message = await ForumMessage.create({
            eventId: req.params.id,
            authorUserId: req.user.userId,
            authorRole: req.user.role,
            authorName,
            content: parsed.data.content,
            parentMessageId,
            isAnnouncement
        });

        const serialized = serializeMessage(message.toObject(), req.user.userId);
        emitForumEvent(req.params.id, 'message_created', { message: serialized });

        return res.status(201).json({ message: serialized });
    } catch (error) {
        return next(error);
    }
};

const togglePinMessage = async (req, res, next) => {
    try {
        const access = await getAccessContext({ user: req.user, eventId: req.params.id });
        if (!access.ok) {
            return res.status(access.status).json({ message: access.message });
        }
        if (!access.canModerate) {
            return res.status(403).json({ message: 'Only event organizers can pin messages' });
        }

        const message = await ForumMessage.findOne({ _id: req.params.messageId, eventId: req.params.id });
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        message.isPinned = !message.isPinned;
        await message.save();

        const serialized = serializeMessage(message.toObject(), req.user.userId);
        emitForumEvent(req.params.id, 'message_updated', { message: serialized });

        return res.json({ message: serialized });
    } catch (error) {
        return next(error);
    }
};

const deleteMessage = async (req, res, next) => {
    try {
        const access = await getAccessContext({ user: req.user, eventId: req.params.id });
        if (!access.ok) {
            return res.status(access.status).json({ message: access.message });
        }
        if (!access.canModerate) {
            return res.status(403).json({ message: 'Only event organizers can delete messages' });
        }

        const message = await ForumMessage.findOne({ _id: req.params.messageId, eventId: req.params.id });
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedByUserId = req.user.userId;
        message.content = '';
        await message.save();

        const serialized = serializeMessage(message.toObject(), req.user.userId);
        emitForumEvent(req.params.id, 'message_updated', { message: serialized });

        return res.json({ message: serialized });
    } catch (error) {
        return next(error);
    }
};

const reactToMessage = async (req, res, next) => {
    const parsed = reactSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid reaction payload' });
    }

    try {
        const access = await getAccessContext({ user: req.user, eventId: req.params.id });
        if (!access.ok) {
            return res.status(access.status).json({ message: access.message });
        }
        if (!access.canParticipate) {
            return res.status(403).json({ message: 'Only registered participants can react in this forum' });
        }

        const message = await ForumMessage.findOne({ _id: req.params.messageId, eventId: req.params.id });
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        if (message.isDeleted) {
            return res.status(400).json({ message: 'Cannot react to removed message' });
        }

        const userId = toIdString(req.user.userId);
        const existingIndex = message.reactions.findIndex((item) => {
            return toIdString(item.userId) === userId && item.emoji === parsed.data.emoji;
        });

        if (existingIndex >= 0) {
            message.reactions.splice(existingIndex, 1);
        } else {
            message.reactions = message.reactions.filter((item) => toIdString(item.userId) !== userId || item.emoji !== parsed.data.emoji);
            message.reactions.push({ userId: req.user.userId, emoji: parsed.data.emoji });
        }

        await message.save();

        const serialized = serializeMessage(message.toObject(), req.user.userId);
        emitForumEvent(req.params.id, 'message_updated', { message: serialized });

        return res.json({ message: serialized });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    listMessages,
    createMessage,
    togglePinMessage,
    deleteMessage,
    reactToMessage
};
