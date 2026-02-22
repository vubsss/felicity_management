const { z } = require('zod');
const Event = require('../models/Event');
const Organiser = require('../models/Organiser');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { sendTicketEmail } = require('../utils/mailer');
const { buildTicket, validateMerchandiseSelection } = require('./eventController');
const { computeDisplayStatus, computeRegistrationStatus } = require('../utils/eventStatus');

const allowedCategories = ['tech', 'sports', 'design', 'dance', 'music', 'quiz', 'concert', 'gaming', 'misc'];

const publicListSchema = z.object({
    search: z.string().optional(),
    category: z.enum(allowedCategories).optional()
});

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
    tags: z.array(z.string().min(1)).optional(),
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

const paymentReviewSchema = z.object({
    registrationId: z.string().min(1),
    decision: z.enum(['approve', 'reject']),
    note: z.string().max(500).optional()
});

const attendanceScanSchema = z.object({
    payload: z.string().min(1)
});

const attendanceManualSchema = z.object({
    registrationId: z.string().min(1),
    attendance: z.boolean(),
    note: z.string().max(500).optional()
});

const parseQrPayload = (payload) => {
    try {
        const parsed = JSON.parse(payload);
        return {
            eventId: parsed.eventId ? String(parsed.eventId) : null,
            participantId: parsed.participantId ? String(parsed.participantId) : null,
            ticketCode: parsed.ticketCode ? String(parsed.ticketCode) : null
        };
    } catch (error) {
        return { eventId: null, participantId: null, ticketCode: String(payload).trim() };
    }
};

const getPaymentProofDataUrl = (registration) => {
    if (!registration?.paymentProof?.buffer || !registration?.paymentProof?.mimetype) {
        return '';
    }
    return `data:${registration.paymentProof.mimetype};base64,${registration.paymentProof.buffer}`;
};

const validateEventTimeline = ({ registrationDeadline, startTime, endTime }) => {
    if (!endTime) return null;

    const end = new Date(endTime);
    if (Number.isNaN(end.getTime())) return null;

    if (startTime) {
        const start = new Date(startTime);
        if (!Number.isNaN(start.getTime()) && start >= end) {
            return 'Start time must be before end time';
        }
    }

    if (registrationDeadline) {
        const deadline = new Date(registrationDeadline);
        if (!Number.isNaN(deadline.getTime()) && deadline >= end) {
            return 'Registration deadline must be before end time';
        }
    }

    return null;
};

const ensureEditableForm = async (eventId, updates) => {
    if (!updates.customForm) {
        return { ok: true };
    }
    const count = await Registration.countDocuments({ eventId });
    if (count > 0) {
        return { ok: false, message: 'Form is locked after the first registration. You cannot modify custom form fields.' };
    }
    return { ok: true };
};

const buildAnalytics = async (event) => {
    const registrations = await Registration.find({ eventId: event._id });
    const normalRegistrations = registrations.filter((r) => r.type === 'normal' && r.status === 'registered');
    const merchandisePurchases = registrations.filter((r) => r.type === 'merchandise' && r.status === 'successful');
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

const postDiscordWebhook = async (webhookUrl, event) => {
    if (!webhookUrl) return;

    const start = event.startTime ? new Date(event.startTime).toLocaleString() : 'TBD';
    const end = event.endTime ? new Date(event.endTime).toLocaleString() : 'TBD';
    const deadline = event.registrationDeadline
        ? new Date(event.registrationDeadline).toLocaleString()
        : 'TBD';

    const content = [
        `New event published: ${event.name}`,
        `Type: ${event.eventType}`,
        `Category: ${event.category || 'Uncategorized'}`,
        `Eligibility: ${event.eligibility || 'TBD'}`,
        `Starts: ${start}`,
        `Ends: ${end}`,
        `Registration deadline: ${deadline}`
    ].join('\n');

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
    } catch (error) {
        // Ignore webhook failures to avoid blocking publishes.
    }
};

const listPublicOrganisers = async (req, res, next) => {
    const parsed = publicListSchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid query parameters' });
    }

    try {
        const filter = { status: 'active' };
        if (parsed.data.category) {
            filter.category = parsed.data.category;
        }
        if (parsed.data.search) {
            const escaped = parsed.data.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.name = { $regex: escaped, $options: 'i' };
        }

        const organisers = await Organiser.find(filter)
            .select('name category description contactEmail contactNumber')
            .sort({ name: 1 })
            .lean();

        return res.json({ organisers });
    } catch (error) {
        return next(error);
    }
};

const getPublicOrganiser = async (req, res, next) => {
    try {
        const organiser = await Organiser.findById(req.params.id)
            .select('name category description contactEmail contactNumber')
            .lean();
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const events = await Event.find({ organiserId: organiser._id, status: { $ne: 'draft' } })
            .sort({ startTime: 1 })
            .lean();

        const now = new Date();
        const upcoming = events.filter((event) => !event.endTime || new Date(event.endTime) >= now);
        const past = events.filter((event) => event.endTime && new Date(event.endTime) < now);

        return res.json({ organiser, events: { upcoming, past } });
    } catch (error) {
        return next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }
        const user = await User.findById(req.user.userId).select('email');
        return res.json({ organiser, email: user?.email || '' });
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
            displayStatus: computeDisplayStatus(event),
            registrationStatus: computeRegistrationStatus(event)
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
            displayStatus: computeDisplayStatus(event),
            registrationStatus: computeRegistrationStatus(event)
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

        const registrationDeadline = parsed.data.registrationDeadline
            ? new Date(parsed.data.registrationDeadline)
            : undefined;
        const startTime = parsed.data.startTime ? new Date(parsed.data.startTime) : undefined;
        const endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : undefined;

        const timelineError = validateEventTimeline({ registrationDeadline, startTime, endTime });
        if (timelineError) {
            return res.status(400).json({ message: timelineError });
        }

        const event = new Event({
            organiserId: organiser._id,
            status: 'draft',
            ...parsed.data,
            registrationDeadline,
            startTime,
            endTime
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
        return res.json({
            event: {
                ...event,
                displayStatus: computeDisplayStatus(event),
                registrationStatus: computeRegistrationStatus(event)
            },
            analytics
        });
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

        const timelineError = validateEventTimeline({
            registrationDeadline: event.registrationDeadline,
            startTime: event.startTime,
            endTime: event.endTime
        });
        if (timelineError) {
            return res.status(400).json({ message: timelineError });
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

        await postDiscordWebhook(organiser.discordWebhook, event);

        return res.json({
            event: {
                ...event.toObject(),
                displayStatus: computeDisplayStatus(event),
                registrationStatus: computeRegistrationStatus(event)
            }
        });
    } catch (error) {
        return next(error);
    }
};

const updateStatus = async (req, res, next) => {
    const parsed = z.object({
        status: z.enum(['published', 'ongoing', 'completed', 'closed']).optional(),
        registrationStatus: z.enum(['open', 'closed']).optional()
    })
        .refine((value) => Boolean(value.status) || Boolean(value.registrationStatus), {
            message: 'At least one status field is required'
        })
        .safeParse(req.body);
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

        if (parsed.data.status) {
            const nextStatus = parsed.data.status;
            const allowed = ['published', 'ongoing', 'completed', 'closed'];
            if (!allowed.includes(nextStatus)) {
                return res.status(400).json({ message: 'Invalid status' });
            }

            if (event.status === 'draft') {
                return res.status(400).json({ message: 'Draft events must be published first' });
            }

            event.status = nextStatus;
        }

        if (parsed.data.registrationStatus) {
            if (event.status === 'draft') {
                return res.status(400).json({ message: 'Publish the event before changing registration status' });
            }

            if (parsed.data.registrationStatus === 'closed') {
                event.registrationManuallyClosed = true;
            }

            if (parsed.data.registrationStatus === 'open') {
                if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
                    return res.status(400).json({ message: 'Cannot reopen registrations after the deadline' });
                }
                if (event.status === 'closed' || event.status === 'completed') {
                    return res.status(400).json({ message: 'Cannot open registrations for a closed event' });
                }
                event.registrationManuallyClosed = false;
            }
        }

        await event.save();
        return res.json({
            event: {
                ...event.toObject(),
                displayStatus: computeDisplayStatus(event),
                registrationStatus: computeRegistrationStatus(event)
            }
        });
    } catch (error) {
        return next(error);
    }
};

const requestPasswordReset = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const existing = await PasswordResetRequest.findOne({
            organiserId: organiser._id,
            status: 'open'
        });

        if (existing) {
            return res.json({ request: existing, message: 'Reset request already submitted' });
        }

        const request = new PasswordResetRequest({ organiserId: organiser._id });
        await request.save();

        return res.status(201).json({ request, message: 'Reset request submitted' });
    } catch (error) {
        return next(error);
    }
};

const getParticipants = async (req, res, next) => {
    const parsed = z.object({
        search: z.string().optional(),
        status: z.enum(['registered', 'pending_payment', 'pending_approval', 'successful', 'cancelled', 'rejected']).optional(),
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
                let payment = 'Free';
                if (registration.type === 'merchandise') {
                    if (registration.paymentStatus === 'pending') payment = 'Pending Approval';
                    else if (registration.paymentStatus === 'approved') payment = 'Approved';
                    else if (registration.paymentStatus === 'rejected') payment = 'Rejected';
                    else if (registration.paymentStatus === 'not_submitted') payment = 'Proof Not Submitted';
                    else payment = 'Pending';
                } else if ((event.fee || 0) > 0) {
                    payment = 'Paid';
                }
                return {
                    id: registration._id,
                    name,
                    email,
                    registeredAt: registration.createdAt,
                    payment,
                    team: teamName,
                    attendance: registration.attendance,
                    attendanceMarkedAt: registration.attendanceMarkedAt,
                    status: registration.status,
                    type: registration.type,
                    paymentStatus: registration.paymentStatus
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

        const header = ['Name', 'Email', 'RegisteredAt', 'Payment', 'Team', 'Attendance', 'AttendanceMarkedAt', 'Status', 'Type'];
        const rows = registrations.map((registration) => {
            const participant = registration.participantId;
            const email = participant?.userId?.email || '';
            const name = participant ? `${participant.firstName} ${participant.lastName}`.trim() : '';
            const teamName = registration?.formData?.teamName || registration?.formData?.team || '';
            let payment = 'Free';
            if (registration.type === 'merchandise') {
                if (registration.paymentStatus === 'pending') payment = 'Pending Approval';
                else if (registration.paymentStatus === 'approved') payment = 'Approved';
                else if (registration.paymentStatus === 'rejected') payment = 'Rejected';
                else if (registration.paymentStatus === 'not_submitted') payment = 'Proof Not Submitted';
                else payment = 'Pending';
            } else if ((event.fee || 0) > 0) {
                payment = 'Paid';
            }
            return [
                name,
                email,
                registration.createdAt.toISOString(),
                payment,
                teamName,
                registration.attendance ? 'Yes' : 'No',
                registration.attendanceMarkedAt ? registration.attendanceMarkedAt.toISOString() : '',
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

const listPaymentApprovals = async (req, res, next) => {
    const parsed = z.object({
        status: z.enum(['all', 'pending', 'approved', 'rejected']).optional()
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

        const filter = {
            eventId: event._id,
            type: 'merchandise',
            paymentStatus: { $in: ['pending', 'approved', 'rejected'] }
        };

        if (parsed.data.status && parsed.data.status !== 'all') {
            filter.paymentStatus = parsed.data.status;
        }

        const orders = await Registration.find(filter)
            .populate({
                path: 'participantId',
                populate: { path: 'userId', model: User, select: 'email' }
            })
            .populate('ticketId')
            .sort({ updatedAt: -1 })
            .lean();

        const rows = orders.map((order) => {
            const participant = order.participantId;
            return {
                id: order._id,
                participantName: participant ? `${participant.firstName} ${participant.lastName}`.trim() : 'Unknown',
                participantEmail: participant?.userId?.email || '',
                items: order.orderItems || [],
                status: order.paymentStatus,
                orderStatus: order.status,
                proofUploadedAt: order.paymentProof?.uploadedAt || null,
                proofImageUrl: getPaymentProofDataUrl(order),
                review: order.paymentReview || null,
                ticketId: order.ticketId?._id || null,
                ticketCode: order.ticketId?.ticketCode || null,
                createdAt: order.createdAt
            };
        });

        return res.json({ orders: rows });
    } catch (error) {
        return next(error);
    }
};

const reviewPaymentApproval = async (req, res, next) => {
    const parsed = paymentReviewSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid payment review payload' });
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

        const registration = await Registration.findOne({
            _id: parsed.data.registrationId,
            eventId: event._id,
            type: 'merchandise'
        }).populate({
            path: 'participantId',
            populate: { path: 'userId', model: User, select: 'email' }
        });

        if (!registration) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (registration.paymentStatus !== 'pending') {
            return res.status(400).json({ message: 'Only pending payments can be reviewed' });
        }

        registration.paymentReview = {
            reviewedAt: new Date(),
            reviewedBy: organiser._id,
            note: parsed.data.note || ''
        };

        if (parsed.data.decision === 'reject') {
            registration.paymentStatus = 'rejected';
            registration.status = 'rejected';
            await registration.save();
            return res.json({ message: 'Payment rejected', registration });
        }

        const validation = validateMerchandiseSelection(event, registration.orderItems || []);
        if (!validation.ok) {
            registration.paymentStatus = 'rejected';
            registration.status = 'rejected';
            registration.paymentReview.note = parsed.data.note || validation.message;
            await registration.save();
            return res.status(400).json({
                message: `Approval failed: ${validation.message}`,
                registration
            });
        }

        validation.items.forEach((selection) => {
            const eventItem = event.merchandise?.items?.find((item) => item.name === selection.itemName);
            const variant = eventItem?.variants?.find((v) => v.label === selection.variantLabel);
            if (variant) {
                variant.stock -= selection.quantity;
            }
        });
        await event.save();

        const ticket = await buildTicket({ eventId: event._id, participantId: registration.participantId._id });
        registration.ticketId = ticket._id;
        registration.paymentStatus = 'approved';
        registration.status = 'successful';
        await registration.save();

        try {
            const frontendUrl = process.env.FRONTEND_URL;
            const ticketUrl = frontendUrl ? `${frontendUrl.replace(/\/$/, '')}/tickets/${ticket._id}` : '';
            const email = registration.participantId?.userId?.email;
            if (email) {
                await sendTicketEmail({
                    to: email,
                    event,
                    ticket,
                    ticketUrl
                });
            }
        } catch (emailError) {
            // Ignore email errors to avoid blocking approval workflow.
        }

        return res.json({
            message: 'Payment approved and ticket issued',
            registration,
            ticket
        });
    } catch (error) {
        return next(error);
    }
};

const getAttendanceDashboard = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const event = await Event.findOne({ _id: req.params.id, organiserId: organiser._id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const registrations = await Registration.find({
            eventId: event._id,
            status: { $in: ['registered', 'successful'] }
        })
            .populate({
                path: 'participantId',
                populate: { path: 'userId', model: User, select: 'email' }
            })
            .populate('ticketId')
            .sort({ createdAt: -1 })
            .lean();

        const rows = registrations
            .filter((registration) => registration.ticketId)
            .map((registration) => {
                const participant = registration.participantId;
                return {
                    registrationId: registration._id,
                    participantName: participant ? `${participant.firstName} ${participant.lastName}`.trim() : 'Unknown',
                    participantEmail: participant?.userId?.email || '',
                    ticketCode: registration.ticketId?.ticketCode || '',
                    attendance: registration.attendance,
                    attendanceMarkedAt: registration.attendanceMarkedAt,
                    attendanceMethod: registration.attendanceMethod,
                    status: registration.status,
                    logs: registration.attendanceLogs || []
                };
            });

        const scannedCount = rows.filter((row) => row.attendance).length;
        const totalCount = rows.length;

        return res.json({
            event: { id: event._id, name: event.name },
            summary: {
                total: totalCount,
                scanned: scannedCount,
                notScanned: Math.max(totalCount - scannedCount, 0)
            },
            attendees: rows
        });
    } catch (error) {
        return next(error);
    }
};

const scanAttendance = async (req, res, next) => {
    const parsed = attendanceScanSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid scan payload' });
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

        const ticketPayload = parseQrPayload(parsed.data.payload);
        if (!ticketPayload.ticketCode) {
            return res.status(400).json({ message: 'Unable to parse ticket data' });
        }

        if (ticketPayload.eventId && ticketPayload.eventId !== String(event._id)) {
            return res.status(400).json({ message: 'Ticket does not belong to this event' });
        }

        const ticket = await Ticket.findOne({
            ticketCode: ticketPayload.ticketCode,
            eventId: event._id,
            status: 'active'
        });

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found or inactive' });
        }

        const registration = await Registration.findOne({
            eventId: event._id,
            participantId: ticket.participantId,
            ticketId: ticket._id,
            status: { $in: ['registered', 'successful'] }
        }).populate({
            path: 'participantId',
            populate: { path: 'userId', model: User, select: 'email' }
        });

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found for ticket' });
        }

        if (registration.attendance) {
            registration.attendanceLogs.push({
                action: 'scan_duplicate',
                at: new Date(),
                by: organiser._id,
                method: 'scan',
                note: 'Duplicate scan rejected'
            });
            await registration.save();
            return res.status(409).json({ message: 'Duplicate scan: attendance already marked' });
        }

        registration.attendance = true;
        registration.attendanceMarkedAt = new Date();
        registration.attendanceMethod = 'scan';
        registration.attendanceMarkedBy = organiser._id;
        registration.attendanceLogs.push({
            action: 'scan_success',
            at: registration.attendanceMarkedAt,
            by: organiser._id,
            method: 'scan',
            note: 'Attendance marked from QR scan'
        });
        await registration.save();

        return res.json({
            message: 'Attendance marked successfully',
            attendance: {
                registrationId: registration._id,
                participantName: `${registration.participantId?.firstName || ''} ${registration.participantId?.lastName || ''}`.trim(),
                participantEmail: registration.participantId?.userId?.email || '',
                ticketCode: ticket.ticketCode,
                markedAt: registration.attendanceMarkedAt
            }
        });
    } catch (error) {
        return next(error);
    }
};

const manualAttendanceOverride = async (req, res, next) => {
    const parsed = attendanceManualSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid manual override payload' });
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

        const registration = await Registration.findOne({
            _id: parsed.data.registrationId,
            eventId: event._id,
            status: { $in: ['registered', 'successful'] }
        });

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        registration.attendance = parsed.data.attendance;
        registration.attendanceMarkedAt = parsed.data.attendance ? new Date() : null;
        registration.attendanceMethod = 'manual';
        registration.attendanceMarkedBy = organiser._id;
        registration.attendanceLogs.push({
            action: 'manual_override',
            at: new Date(),
            by: organiser._id,
            method: 'manual',
            note: parsed.data.note || (parsed.data.attendance ? 'Marked present manually' : 'Marked absent manually')
        });
        await registration.save();

        return res.json({ message: 'Attendance updated manually', registration });
    } catch (error) {
        return next(error);
    }
};

const exportAttendance = async (req, res, next) => {
    try {
        const organiser = await Organiser.findOne({ userId: req.user.userId });
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const event = await Event.findOne({ _id: req.params.id, organiserId: organiser._id });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const registrations = await Registration.find({
            eventId: event._id,
            status: { $in: ['registered', 'successful'] }
        })
            .populate({
                path: 'participantId',
                populate: { path: 'userId', model: User, select: 'email' }
            })
            .populate('ticketId')
            .sort({ createdAt: -1 });

        const header = ['Name', 'Email', 'TicketCode', 'Attendance', 'MarkedAt', 'Method', 'Status'];
        const rows = registrations
            .filter((registration) => registration.ticketId)
            .map((registration) => {
                const participant = registration.participantId;
                const name = participant ? `${participant.firstName} ${participant.lastName}`.trim() : '';
                return [
                    name,
                    participant?.userId?.email || '',
                    registration.ticketId?.ticketCode || '',
                    registration.attendance ? 'Present' : 'Absent',
                    registration.attendanceMarkedAt ? registration.attendanceMarkedAt.toISOString() : '',
                    registration.attendanceMethod || '',
                    registration.status
                ];
            });

        const csv = [header, ...rows]
            .map((row) => row.map((field) => `"${String(field).replace(/\"/g, '""')}"`).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.name}-attendance.csv"`);
        return res.status(200).send(csv);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    listPublicOrganisers,
    getPublicOrganiser,
    getProfile,
    updateProfile,
    getDashboard,
    listEvents,
    createEventDraft,
    getEvent,
    updateEvent,
    publishEvent,
    updateStatus,
    requestPasswordReset,
    getParticipants,
    exportParticipants,
    listPaymentApprovals,
    reviewPaymentApproval,
    getAttendanceDashboard,
    scanAttendance,
    manualAttendanceOverride,
    exportAttendance
};
