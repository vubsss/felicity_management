const bcrypt = require('bcrypt');
const { z } = require('zod');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

const allowedInterests = ['tech', 'sports', 'design', 'dance', 'music', 'quiz', 'concert', 'gaming', 'misc'];

const preferencesSchema = z.object({
    interests: z.array(z.enum(allowedInterests)).optional(),
    followedOrganisers: z.array(z.string()).optional()
});

const profileSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    organisation: z.string().optional(),
    contactNumber: z.string().min(1).optional()
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6)
});

const cancelRegistrationSchema = z.object({
    registrationId: z.string().min(1)
});

const getProfile = async (req, res, next) => {
    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const user = await User.findById(req.user.userId).select('email');
        return res.json({
            participant,
            email: user?.email || ''
        });
    } catch (error) {
        return next(error);
    }
};

const updateProfile = async (req, res, next) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid profile payload' });
    }

    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        Object.assign(participant, parsed.data);
        await participant.save();

        return res.json({ participant });
    } catch (error) {
        return next(error);
    }
};

const changePassword = async (req, res, next) => {
    const parsed = passwordSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid password payload' });
    }

    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const match = await bcrypt.compare(parsed.data.currentPassword, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
        user.password = await bcrypt.hash(parsed.data.newPassword, saltRounds);
        await user.save();

        return res.json({ message: 'Password updated' });
    } catch (error) {
        return next(error);
    }
};

const followOrganiser = async (req, res, next) => {
    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const organiserId = req.params.id;
        if (!participant.followedOrganisers.some((id) => id.toString() === organiserId)) {
            participant.followedOrganisers.push(organiserId);
            await participant.save();
        }

        return res.json({ followedOrganisers: participant.followedOrganisers });
    } catch (error) {
        return next(error);
    }
};

const unfollowOrganiser = async (req, res, next) => {
    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const organiserId = req.params.id;
        participant.followedOrganisers = participant.followedOrganisers.filter(
            (id) => id.toString() !== organiserId
        );
        await participant.save();

        return res.json({ followedOrganisers: participant.followedOrganisers });
    } catch (error) {
        return next(error);
    }
};

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
            if (Array.isArray(parsed.data.interests) && parsed.data.interests.length > 0) {
                participant.onboardingCompleted = true;
            }
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

const cancelRegistration = async (req, res, next) => {
    const parsed = cancelRegistrationSchema.safeParse({ registrationId: req.params.id });
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid registration id' });
    }

    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const registration = await Registration.findOne({
            _id: parsed.data.registrationId,
            participantId: participant._id
        }).populate('eventId');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        if (registration.type !== 'normal') {
            return res.status(400).json({ message: 'Only event registrations can be cancelled here' });
        }

        if (registration.status === 'cancelled') {
            return res.status(400).json({ message: 'Registration is already cancelled' });
        }

        if (registration.status !== 'registered') {
            return res.status(400).json({ message: 'Only active registrations can be cancelled' });
        }

        const event = registration.eventId;
        if (!event) {
            return res.status(404).json({ message: 'Event not found for this registration' });
        }

        if (event.startTime && new Date(event.startTime) <= new Date()) {
            return res.status(400).json({ message: 'Cannot cancel after the event has started' });
        }

        registration.status = 'cancelled';
        await registration.save();

        if (registration.ticketId) {
            const ticket = await Ticket.findById(registration.ticketId);
            if (ticket) {
                ticket.status = 'cancelled';
                await ticket.save();
            }
        }

        return res.json({
            message: 'Registration cancelled successfully',
            registration
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getPreferences,
    updatePreferences,
    getRegistrations,
    getTicket,
    cancelRegistration,
    getProfile,
    updateProfile,
    changePassword,
    followOrganiser,
    unfollowOrganiser
};
