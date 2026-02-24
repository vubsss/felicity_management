const Event = require('../models/Event');
const Organiser = require('../models/Organiser');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const { forumRoom } = require('../utils/socket');

const canAccessEventForum = async (user, eventId) => {
    if (user.role === 'organiser') {
        const organiser = await Organiser.findOne({ userId: user.userId }).select('_id').lean();
        if (!organiser) return false;
        const event = await Event.findOne({ _id: eventId, organiserId: organiser._id }).select('_id').lean();
        return Boolean(event);
    }

    if (user.role === 'participant') {
        const event = await Event.findOne({ _id: eventId, status: { $ne: 'draft' } }).select('_id').lean();
        if (!event) return false;
        const participant = await Participant.findOne({ userId: user.userId }).select('_id').lean();
        if (!participant) return false;
        const registration = await Registration.findOne({
            eventId,
            participantId: participant._id,
            status: { $nin: ['cancelled', 'rejected'] }
        }).select('_id').lean();
        return Boolean(registration);
    }

    const event = await Event.findById(eventId).select('_id').lean();
    return Boolean(event);
};

const registerForumSocketHandlers = (io, socket) => {
    socket.on('forum:join', async ({ eventId }) => {
        if (!eventId) {
            socket.emit('forum:error', { message: 'Missing eventId' });
            return;
        }
        const allowed = await canAccessEventForum(socket.user, eventId);
        if (!allowed) {
            socket.emit('forum:error', { message: 'Forum access denied' });
            return;
        }
        socket.join(forumRoom(eventId));
        socket.emit('forum:joined', { eventId: String(eventId) });
    });

    socket.on('forum:leave', ({ eventId }) => {
        if (!eventId) return;
        socket.leave(forumRoom(eventId));
    });
};

module.exports = {
    registerForumSocketHandlers
};
