const { z } = require('zod');
const Event = require('../models/Event');
const Organiser = require('../models/Organiser');
const Participant = require('../models/Participant');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const { sendTicketEmail } = require('../utils/mailer');
const { computeDisplayStatus, computeRegistrationStatus, isRegistrationClosed } = require('../utils/eventStatus');

const browseSchema = z.object({
    search: z.string().optional(),
    eventType: z.enum(['normal', 'merchandise']).optional(),
    eligibility: z.enum(['internal', 'external', 'both']).optional(),
    category: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    trending: z.string().optional(),
    organiserIds: z.string().optional()
});

const registerSchema = z.object({
    formData: z.record(z.any()).optional(),
    fileUploadMap: z.record(z.any()).optional()
});

const purchaseSchema = z.object({
    items: z.array(
        z.object({
            itemName: z.string(),
            variantLabel: z.string(),
            quantity: z.number().int().positive().default(1)
        })
    )
});

const uploadPaymentProofSchema = z.object({
    registrationId: z.string().min(1)
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseObjectIdString = (value) => String(value);

const validateMerchandiseSelection = (event, items) => {
    const normalized = [];

    for (const item of items) {
        const eventItem = event.merchandise?.items?.find((i) => i.name === item.itemName);
        if (!eventItem) {
            return { ok: false, message: `Item not found: ${item.itemName}` };
        }

        const variant = eventItem.variants.find((v) => v.label === item.variantLabel);
        if (!variant) {
            return { ok: false, message: `Variant not found: ${item.variantLabel}` };
        }

        if (item.quantity > (eventItem.purchaseLimit || 1)) {
            return { ok: false, message: `Purchase limit exceeded for ${item.itemName}` };
        }

        if (variant.stock < item.quantity) {
            return { ok: false, message: `Out of stock: ${item.itemName}` };
        }

        normalized.push({
            itemName: item.itemName,
            variantLabel: item.variantLabel,
            quantity: item.quantity
        });
    }

    return { ok: true, items: normalized };
};

const buildTicket = async ({ eventId, participantId }) => {
    const ticketCode = `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const qrData = JSON.stringify({ eventId, participantId, ticketCode });
    const ticket = new Ticket({ eventId, participantId, ticketCode, qrData });
    await ticket.save();
    return ticket;
};

const browseEvents = async (req, res, next) => {
    const parsed = browseSchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid query parameters' });
    }

    try {
        const {
            search,
            eventType,
            eligibility,
            category,
            dateFrom,
            dateTo,
            trending,
            organiserIds
        } = parsed.data;

        const filter = { status: { $ne: 'draft' } };
        if (eventType) filter.eventType = eventType;
        if (eligibility) filter.eligibility = eligibility;
        if (category) filter.category = category;
        if (dateFrom || dateTo) {
            filter.startTime = {};
            if (dateFrom) filter.startTime.$gte = new Date(dateFrom);
            if (dateTo) filter.startTime.$lte = new Date(dateTo);
        }

        if (organiserIds) {
            const ids = organiserIds.split(',').map((id) => id.trim()).filter(Boolean);
            if (ids.length) {
                filter.organiserId = { $in: ids };
            }
        }

        if (search) {
            const escaped = escapeRegex(search);
            const fuzzy = escaped.split('').join('.*');
            const pattern = search.length > 2 ? fuzzy : escaped;
            const nameRegex = new RegExp(pattern, 'i');

            const matchedOrganisers = await Organiser.find({ name: { $regex: nameRegex } })
                .select('_id')
                .lean();
            const organiserMatchIds = matchedOrganisers.map((o) => o._id);

            filter.$or = [
                { name: { $regex: nameRegex } },
                { tags: { $in: [nameRegex] } },
                { organiserId: { $in: organiserMatchIds } }
            ];
        }

        let events = await Event.find(filter)
            .populate({ path: 'organiserId', select: 'name category description contactEmail' })
            .sort({ startTime: 1 })
            .lean();

        events = events.map((event) => ({
            ...event,
            displayStatus: computeDisplayStatus(event),
            registrationStatus: computeRegistrationStatus(event)
        }));

        if (trending === 'true') {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const registrations = await Registration.aggregate([
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: '$eventId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]);
            const trendingIds = registrations.map((r) => r._id.toString());
            events = events
                .filter((event) => trendingIds.includes(event._id.toString()))
                .sort((a, b) => trendingIds.indexOf(a._id.toString()) - trendingIds.indexOf(b._id.toString()));
        }

        return res.json({ events });
    } catch (error) {
        return next(error);
    }
};

const getEvent = async (req, res, next) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, status: { $ne: 'draft' } })
            .populate({ path: 'organiserId', select: 'name category description contactEmail' })
            .lean();
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        const registrationCount = await Registration.countDocuments({ eventId: event._id });
        const remainingSpots = typeof event.regLimit === 'number'
            ? Math.max(event.regLimit - registrationCount, 0)
            : null;

        return res.json({
            event: {
                ...event,
                displayStatus: computeDisplayStatus(event),
                registrationStatus: computeRegistrationStatus(event)
            },
            registrationCount,
            remainingSpots
        });
    } catch (error) {
        return next(error);
    }
};

const validateFormSubmission = (event, formData, fileMap = {}) => {
    if (!event.customForm || event.customForm.length === 0) {
        return { valid: true };
    }

    for (const field of event.customForm) {
        const fieldValue = formData[field.label];
        const fileValue = fileMap[field.label];

        // Check required fields
        if (field.required) {
            if (field.fieldType === 'file') {
                if (!fileValue) {
                    return {
                        valid: false,
                        message: `${field.label} is required`
                    };
                }
            } else {
                if (!fieldValue || String(fieldValue).trim() === '') {
                    return {
                        valid: false,
                        message: `${field.label} is required`
                    };
                }
            }
        }
    }

    return { valid: true };
};

const registerForEvent = async (req, res, next) => {
    const fileMap = {};
    if (req.files) {
        for (const file of req.files) {
            fileMap[file.fieldname] = {
                filename: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                buffer: file.buffer.toString('base64')
            };
        }
    }

    let parsedFormData = {};
    if (req.body?.formData) {
        if (typeof req.body.formData === 'string') {
            try {
                parsedFormData = JSON.parse(req.body.formData);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid registration payload' });
            }
        } else if (typeof req.body.formData === 'object') {
            parsedFormData = req.body.formData;
        }
    }

    const parsed = registerSchema.safeParse({
        formData: parsedFormData,
        fileUploadMap: fileMap
    });
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid registration payload' });
    }

    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.eventType !== 'normal') {
            return res.status(400).json({ message: 'Not a normal event' });
        }
        if (isRegistrationClosed(event)) {
            return res.status(400).json({ message: 'Registration is closed for this event' });
        }

        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        if (event.eligibility !== 'both' && participant.participantType !== event.eligibility) {
            return res.status(403).json({ message: 'Not eligible for this event' });
        }

        const regCount = await Registration.countDocuments({ eventId: event._id });
        if (regCount >= event.regLimit) {
            return res.status(400).json({ message: 'Registration limit reached' });
        }

        const existing = await Registration.findOne({
            eventId: event._id,
            participantId: participant._id,
            type: 'normal'
        });
        if (existing) {
            return res.status(400).json({ message: 'Already registered' });
        }

        // Validate form submission
        const formValidation = validateFormSubmission(event, parsed.data.formData || {}, fileMap);
        if (!formValidation.valid) {
            return res.status(400).json({ message: formValidation.message });
        }

        // Combine form data and file uploads
        const combinedFormData = {
            ...parsed.data.formData,
            ...fileMap
        };

        const ticket = await buildTicket({ eventId: event._id, participantId: participant._id });
        const registration = new Registration({
            eventId: event._id,
            participantId: participant._id,
            type: 'normal',
            status: 'registered',
            formData: combinedFormData || null,
            ticketId: ticket._id
        });
        await registration.save();

        try {
            const user = await User.findById(participant.userId).select('email').lean();
            const frontendUrl = process.env.FRONTEND_URL;
            const ticketUrl = frontendUrl ? `${frontendUrl.replace(/\/$/, '')}/tickets/${ticket._id}` : '';
            if (user?.email) {
                await sendTicketEmail({
                    to: user.email,
                    event,
                    ticket,
                    ticketUrl
                });
            }
        } catch (emailError) {
            // Ignore email failures to avoid blocking registration.
        }

        return res.status(201).json({ registration, ticket });
    } catch (error) {
        return next(error);
    }
};

const purchaseMerchandise = async (req, res, next) => {
    const parsed = purchaseSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid purchase payload' });
    }

    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.eventType !== 'merchandise') {
            return res.status(400).json({ message: 'Not a merchandise event' });
        }
        if (isRegistrationClosed(event)) {
            return res.status(400).json({ message: 'Purchases are closed for this event' });
        }

        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        if (event.eligibility !== 'both' && participant.participantType !== event.eligibility) {
            return res.status(403).json({ message: 'Not eligible for this event' });
        }

        const validation = validateMerchandiseSelection(event, parsed.data.items);
        if (!validation.ok) {
            return res.status(400).json({ message: validation.message });
        }

        const registration = new Registration({
            eventId: event._id,
            participantId: participant._id,
            type: 'merchandise',
            status: 'pending_payment',
            paymentStatus: 'not_submitted',
            orderItems: validation.items
        });
        await registration.save();

        return res.status(201).json({
            message: 'Order created. Upload payment proof for approval.',
            registration
        });
    } catch (error) {
        return next(error);
    }
};

const uploadMerchandisePaymentProof = async (req, res, next) => {
    const parsed = uploadPaymentProofSchema.safeParse(req.params || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid registration id' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Payment proof image is required' });
    }

    if (!String(req.file.mimetype || '').startsWith('image/')) {
        return res.status(400).json({ message: 'Payment proof must be an image file' });
    }

    try {
        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        const registration = await Registration.findOne({
            _id: parsed.data.registrationId,
            participantId: participant._id,
            type: 'merchandise'
        });

        if (!registration) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (registration.status === 'successful') {
            return res.status(400).json({ message: 'Payment already approved for this order' });
        }

        if (registration.status === 'cancelled') {
            return res.status(400).json({ message: 'Cancelled orders cannot be updated' });
        }

        registration.paymentProof = {
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            buffer: req.file.buffer.toString('base64'),
            uploadedAt: new Date()
        };
        registration.paymentStatus = 'pending';
        registration.status = 'pending_approval';
        registration.paymentReview = {
            reviewedAt: null,
            reviewedBy: null,
            note: ''
        };

        await registration.save();

        return res.json({
            message: 'Payment proof uploaded. Order is pending organizer approval.',
            registration
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    browseEvents,
    getEvent,
    registerForEvent,
    purchaseMerchandise,
    uploadMerchandisePaymentProof,
    validateFormSubmission,
    buildTicket,
    validateMerchandiseSelection,
    parseObjectIdString
};
