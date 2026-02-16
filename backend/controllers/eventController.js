const { z } = require('zod');
const Event = require('../models/Event');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');

const browseSchema = z.object({
    search: z.string().optional(),
    eventType: z.enum(['normal', 'merchandise']).optional(),
    eligibility: z.enum(['internal', 'external', 'both']).optional(),
    category: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    trending: z.string().optional()
});

const registerSchema = z.object({
    formData: z.record(z.any()).optional()
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
            trending
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

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        let events = await Event.find(filter).sort({ startTime: 1 }).lean();

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
        const event = await Event.findOne({ _id: req.params.id, status: { $ne: 'draft' } }).lean();
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        return res.json({ event });
    } catch (error) {
        return next(error);
    }
};

const registerForEvent = async (req, res, next) => {
    const parsed = registerSchema.safeParse(req.body || {});
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
        if (event.status === 'draft' || event.status === 'closed' || event.status === 'completed') {
            return res.status(400).json({ message: 'Registration is closed for this event' });
        }
        if (new Date(event.registrationDeadline) < new Date()) {
            return res.status(400).json({ message: 'Registration deadline passed' });
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

        const ticket = await buildTicket({ eventId: event._id, participantId: participant._id });
        const registration = new Registration({
            eventId: event._id,
            participantId: participant._id,
            type: 'normal',
            status: 'registered',
            formData: parsed.data.formData || null,
            ticketId: ticket._id
        });
        await registration.save();

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
        if (event.status === 'draft' || event.status === 'closed' || event.status === 'completed') {
            return res.status(400).json({ message: 'Purchases are closed for this event' });
        }
        if (new Date(event.registrationDeadline) < new Date()) {
            return res.status(400).json({ message: 'Purchase deadline passed' });
        }

        const participant = await Participant.findOne({ userId: req.user.userId });
        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        if (event.eligibility !== 'both' && participant.participantType !== event.eligibility) {
            return res.status(403).json({ message: 'Not eligible for this event' });
        }

        const updates = [];
        for (const item of parsed.data.items) {
            const eventItem = event.merchandise?.items?.find((i) => i.name === item.itemName);
            if (!eventItem) {
                return res.status(400).json({ message: `Item not found: ${item.itemName}` });
            }
            const variant = eventItem.variants.find((v) => v.label === item.variantLabel);
            if (!variant) {
                return res.status(400).json({ message: `Variant not found: ${item.variantLabel}` });
            }
            if (item.quantity > eventItem.purchaseLimit) {
                return res.status(400).json({ message: `Purchase limit exceeded for ${item.itemName}` });
            }
            if (variant.stock < item.quantity) {
                return res.status(400).json({ message: `Out of stock: ${item.itemName}` });
            }
            updates.push({ variant, quantity: item.quantity });
        }

        updates.forEach(({ variant, quantity }) => {
            variant.stock -= quantity;
        });
        await event.save();

        const ticket = await buildTicket({ eventId: event._id, participantId: participant._id });
        const registration = new Registration({
            eventId: event._id,
            participantId: participant._id,
            type: 'merchandise',
            status: 'purchased',
            orderItems: parsed.data.items,
            ticketId: ticket._id
        });
        await registration.save();

        return res.status(201).json({ registration, ticket });
    } catch (error) {
        return next(error);
    }
};

module.exports = { browseEvents, getEvent, registerForEvent, purchaseMerchandise };
