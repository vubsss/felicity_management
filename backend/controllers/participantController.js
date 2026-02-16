const { z } = require('zod');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');

const allowedInterests = ['tech', 'sports', 'design', 'dance', 'music', 'quiz', 'concert', 'gaming', 'misc'];

const preferencesSchema = z.object({
    interests: z.array(z.enum(allowedInterests)).optional(),
    followedOrganisers: z.array(z.string()).optional()
});

//func=> get participant preferences (interests and followed organisers)
const getPreferences = async (req, res, next) => {
    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }
        return res.json({
            interests: participant.interests,
            followedOrganisers: participant.followedOrganisers
        });
    } catch (error) {
        return next(error);
    }
};

//func=> update participant preferences (interests and followed organisers)
const updatePreferences = async (req, res, next) => {
    const parsed = preferencesSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid preferences payload' });
    }

    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        if (parsed.data.interests !== undefined) {
            participant.interests = parsed.data.interests;
        }
        if (parsed.data.followedOrganisers !== undefined) {
            participant.followedOrganisers = parsed.data.followedOrganisers;
        }

        await participant.save();
        return res.json({
            interests: participant.interests,
            followedOrganisers: participant.followedOrganisers
        });
    } catch (error) {
        return next(error);
    }
};

const getRegistrations = async (req, res, next) => {
    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const registrations = await Registration.find({ participantId: participant._id })
            .populate({
                path: 'eventId',
                populate: { path: 'organiserId', select: 'name category' }
            })
            .populate('ticketId')
            .sort({ createdAt: -1 });

        return res.json({ registrations });
    } catch (error) {
        return next(error);
    }
};

const getTicket = async (req, res, next) => {
    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const ticket = await Ticket.findOne({
            _id: req.params.id,
            participantId: participant._id
        }).populate({
            path: 'eventId',
            populate: { path: 'organiserId', select: 'name category' }
        });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        return res.json({ ticket });
    } catch (error) {
        return next(error);
    }
};

module.exports = { getPreferences, updatePreferences, getRegistrations, getTicket };
