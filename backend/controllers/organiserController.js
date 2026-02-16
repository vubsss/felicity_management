const { z } = require('zod');
const Event = require('../models/Event');
const Organiser = require('../models/Organiser');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const User = require('../models/User');

const allowedCategories = ['tech', 'sports', 'design', 'dance', 'music', 'quiz', 'concert', 'gaming', 'misc'];

const profileSchema = z.object({
    name: z.string().min(1).optional(),
    category: z.enum(allowedCategories).optional(),
    description: z.string().optional(),
    contactEmail: z.string().email().optional(),
    contactNumber: z.string().optional(),
    discordWebhook: z.string().url().optional()
});

const eventDraftSchema = z.object({
    name: z.string().min(1),
    eventType: z.enum(['normal', 'merchandise']),
    category: z.enum(allowedCategories).optional(),
    description: z.string().optional(),
    eligibility: z.enum(['internal', 'external', 'both']).optional(),
    registrationDeadline: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    regLimit: z.number().int().positive().optional(),
    fee: z.number().min(0).optional(),
    tags: z.array(z.enum(allowedCategories)).optional(),
    customForm: z.array(
        z.object({
            label: z.string().min(1),
            fieldType: z.string().min(1),
            required: z.boolean().optional(),
            options: z.array(z.string()).optional()
        })
    ).optional(),
    merchandise: z.object({
        items: z.array(
            z.object({
                name: z.string().min(1),
                purchaseLimit: z.number().int().positive().optional(),
                variants: z.array(
                    z.object({
                        label: z.string().min(1),
                        stock: z.number().int().nonnegative()
                    })
                )
            })
        ).optional()
    }).optional()
});

const eventUpdateSchema = eventDraftSchema.partial();

const computeDisplayStatus = (event) => {
    if (event.status === 'closed' || event.status === 'completed' || event.status === 'draft') {
        return event.status;
    }
    if (event.status === 'ongoing') {
        return 'ongoing';
    }
    const now = new Date();
    if (event.startTime && event.endTime && now >= event.startTime && now <= event.endTime) {
        return 'ongoing';
    }
    if (event.endTime && now > event.endTime) {
        return 'closed';
    }
    return 'published';
};

const ensureEditableForm = async (eventId, updates) => {
    if (!updates.customForm) {
        return { ok: true };
    }
    const count = await Registration.countDocuments({ eventId });
    if (count > 0) {
        return { ok: false, message: 'Form is locked after the first registration' };
    }
    return { ok: true };
};

const buildAnalytics = async (event) => {
    const registrations = await Registration.find({ eventId: event._id });
    const normalRegistrations = registrations.filter((r) => r.type === 'normal' && r.status !== 'cancelled');
    const merchandisePurchases = registrations.filter((r) => r.type === 'merchandise' && r.status !== 'cancelled');
    const attendanceCount = registrations.filter((r) => r.attendance).length;
    const teamCompletionCount = registrations.filter((r) => r.teamCompleted).length;

    const merchandiseQuantity = merchandisePurchases.reduce((sum, r) => {
        const qty = (r.orderItems || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
        return sum + qty;
    }, 0);

    const normalRevenue = (event.fee || 0) * normalRegistrations.length;
    const merchandiseRevenue = (event.fee || 0) * merchandiseQuantity;

    return {
        registrations: normalRegistrations.length,
        sales: merchandisePurchases.length,
        revenue: normalRevenue + merchandiseRevenue,
        attendance: attendanceCount,
        teamCompletion: teamCompletionCount
    };
};

const getProfile = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }
        return res.json({ organiser });
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
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        Object.assign(organiser, parsed.data);
        await organiser.save();
        return res.json({ organiser });
    } catch (error) {
        return next(error);
    }
};

const getDashboard = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const events = await Event.find({ organiserId: organiser._id }).sort({ createdAt: -1 }).lean();
        const completedEvents = events.filter((event) => ['completed', 'closed'].includes(event.status));

        const analytics = [];
        for (const event of completedEvents) {
            const stats = await buildAnalytics(event);
            analytics.push({ eventId: event._id, name: event.name, status: event.status, ...stats });
        }

        const displayEvents = events.map((event) => ({
            ...event,
            displayStatus: computeDisplayStatus(event)
        }));

        return res.json({ events: displayEvents, analytics });
    } catch (error) {
        return next(error);
    }
};

const listEvents = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const events = await Event.find({ organiserId: organiser._id }).sort({ updatedAt: -1 }).lean();
        const displayEvents = events.map((event) => ({
            ...event,
            displayStatus: computeDisplayStatus(event)
        }));

        return res.json({ events: displayEvents });
    } catch (error) {
        return next(error);
    }
};

const createEventDraft = async (req, res, next) => {
    const parsed = eventDraftSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid event payload' });
    }

    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const event = new Event({
            organiserId: organiser._id,
            status: 'draft',
            ...parsed.data,
            registrationDeadline: parsed.data.registrationDeadline ? new Date(parsed.data.registrationDeadline) : undefined,
            startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : undefined,
            endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : undefined
        });
        await event.save();

        return res.status(201).json({ event });
    } catch (error) {
        return next(error);
    }
};

const getEvent = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const event = await Event.findOne({ _id: req.params.id, organiserId: organiser._id }).lean();
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const analytics = await buildAnalytics(event);
        return res.json({ event: { ...event, displayStatus: computeDisplayStatus(event) }, analytics });
    } catch (error) {
        return next(error);
    }
};

const updateEvent = async (req, res, next) => {
    const parsed = eventUpdateSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid event payload' });
    }

    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const event = await Event.findOne({ _id: req.params.id, organiserId: organiser._id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const updates = parsed.data;
        const formCheck = await ensureEditableForm(event._id, updates);
        if (!formCheck.ok) {
            return res.status(400).json({ message: formCheck.message });
        }

        const now = new Date();
        const isOngoingByTime = event.startTime && now >= event.startTime;

        if (event.status === 'draft') {
            Object.assign(event, {
                ...updates,
                registrationDeadline: updates.registrationDeadline ? new Date(updates.registrationDeadline) : event.registrationDeadline,
                startTime: updates.startTime ? new Date(updates.startTime) : event.startTime,
                endTime: updates.endTime ? new Date(updates.endTime) : event.endTime
            });
        } else if (event.status === 'published' && !isOngoingByTime) {
            const allowedUpdates = {};
            if (typeof updates.description === 'string') allowedUpdates.description = updates.description;
            if (updates.registrationDeadline) {
                const nextDeadline = new Date(updates.registrationDeadline);
                if (event.registrationDeadline && nextDeadline < event.registrationDeadline) {
                    return res.status(400).json({ message: 'Registration deadline can only be extended' });
                }
                allowedUpdates.registrationDeadline = nextDeadline;
            }
            if (typeof updates.regLimit === 'number') {
                if (event.regLimit && updates.regLimit < event.regLimit) {
                    return res.status(400).json({ message: 'Registration limit can only be increased' });
                }
                allowedUpdates.regLimit = updates.regLimit;
            }
            Object.assign(event, allowedUpdates);
        } else {
            return res.status(400).json({ message: 'Event is not editable in the current status' });
        }

        await event.save();
        return res.json({ event });
    } catch (error) {
        return next(error);
    }
};

const publishEvent = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const event = await Event.findOne({ _id: req.params.id, organiserId: organiser._id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft events can be published' });
        }

        event.status = 'published';
        event.publishedAt = new Date();
        await event.validate();
        await event.save();

        return res.json({ event });
    } catch (error) {
        return next(error);
    }
};

const updateStatus = async (req, res, next) => {
    const parsed = z.object({ status: z.enum(['published', 'ongoing', 'completed', 'closed']) }).safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid status payload' });
    }

    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const event = await Event.findOne({ _id: req.params.id, organiserId: organiser._id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const nextStatus = parsed.data.status;
        const allowed = ['published', 'ongoing', 'completed', 'closed'];
        if (!allowed.includes(nextStatus)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        if (event.status === 'draft') {
            return res.status(400).json({ message: 'Draft events must be published first' });
        }

        event.status = nextStatus;
        await event.save();
        return res.json({ event });
    } catch (error) {
        return next(error);
    }
};

const getParticipants = async (req, res, next) => {
    const parsed = z.object({
        search: z.string().optional(),
        status: z.enum(['registered', 'purchased', 'cancelled']).optional(),
        type: z.enum(['normal', 'merchandise']).optional()
    }).safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid query parameters' });
    }

    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const event = await Event.findOne({ _id: req.params.id, organiserId: organiser._id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const filter = { eventId: event._id };
        if (parsed.data.status) filter.status = parsed.data.status;
        if (parsed.data.type) filter.type = parsed.data.type;

        const registrations = await Registration.find(filter)
            .populate({
                path: 'participantId',
                populate: { path: 'userId', model: User, select: 'email' }
            })
            .sort({ createdAt: -1 });

        const search = parsed.data.search?.toLowerCase();
        const rows = registrations
            .map((registration) => {
                const participant = registration.participantId;
                const email = participant?.userId?.email || '';
                const name = participant ? `${participant.firstName} ${participant.lastName}`.trim() : '';
                const teamName = registration?.formData?.teamName || registration?.formData?.team || '';
                const payment = registration.type === 'merchandise' || (event.fee || 0) > 0 ? 'Paid' : 'Free';
                return {
                    id: registration._id,
                    name,
                    email,
                    registeredAt: registration.createdAt,
                    payment,
                    team: teamName,
                    attendance: registration.attendance,
                    status: registration.status,
                    type: registration.type
                };
            })
            .filter((row) => {
                if (!search) return true;
                return row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search);
            });

        return res.json({ participants: rows });
    } catch (error) {
        return next(error);
    }
};

const exportParticipants = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const event = await Event.findOne({ _id: req.params.id, organiserId: organiser._id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const registrations = await Registration.find({ eventId: event._id })
            .populate({
                path: 'participantId',
                populate: { path: 'userId', model: User, select: 'email' }
            })
            .sort({ createdAt: -1 });

        const header = ['Name', 'Email', 'RegisteredAt', 'Payment', 'Team', 'Attendance', 'Status', 'Type'];
        const rows = registrations.map((registration) => {
            const participant = registration.participantId;
            const email = participant?.userId?.email || '';
            const name = participant ? `${participant.firstName} ${participant.lastName}`.trim() : '';
            const teamName = registration?.formData?.teamName || registration?.formData?.team || '';
            const payment = registration.type === 'merchandise' || (event.fee || 0) > 0 ? 'Paid' : 'Free';
            return [
                name,
                email,
                registration.createdAt.toISOString(),
                payment,
                teamName,
                registration.attendance ? 'Yes' : 'No',
                registration.status,
                registration.type
            ];
        });

        const csv = [header, ...rows]
            .map((row) => row.map((field) => `"${String(field).replace(/\"/g, '""')}"`).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.name}-participants.csv"`);
        return res.status(200).send(csv);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getDashboard,
    listEvents,
    createEventDraft,
    getEvent,
    updateEvent,
    publishEvent,
    updateStatus,
    getParticipants,
    exportParticipants
};
