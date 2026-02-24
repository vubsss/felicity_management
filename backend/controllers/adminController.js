const bcrypt = require('bcrypt');
const { z } = require('zod');
const Event = require('../models/Event');
const Organiser = require('../models/Organiser');
const Participant = require('../models/Participant');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

const allowedCategories = ['tech', 'sports', 'design', 'dance', 'music', 'quiz', 'concert', 'gaming', 'misc'];

const normalizeEmpty = (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
};

const organiserSchema = z.object({
    name: z.preprocess(normalizeEmpty, z.string().min(1)),
    category: z.preprocess(normalizeEmpty, z.enum(allowedCategories)),
    description: z.preprocess(normalizeEmpty, z.string().optional()),
    contactEmail: z.preprocess(normalizeEmpty, z.string().email().optional()),
    contactNumber: z.preprocess(normalizeEmpty, z.string().optional()),
    discordWebhook: z.preprocess(normalizeEmpty, z.string().url().optional())
});

const statusSchema = z.object({
    status: z.enum(['active', 'disabled', 'archived'])
});

const generatePassword = (length = 12) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let output = '';
    for (let i = 0; i < length; i += 1) {
        output += chars[Math.floor(Math.random() * chars.length)];
    }
    return output;
};

const slugify = (value) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'organiser';

const generateOrganiserEmail = async (name) => {
    const slug = slugify(name);
    const domain = 'clubs.iiit.ac.in';

    for (let attempt = 0; attempt < 1000; attempt += 1) {
        const numberedSlug = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
        const email = `${numberedSlug}-iiit@${domain}`;
        const existing = await User.exists({ email });
        if (!existing) {
            return email;
        }
    }

    throw new Error('Unable to generate unique organiser email');
};

const listOrganisers = async (req, res, next) => {
    try {
        const organisers = await Organiser.find()
            .populate('userId', 'email isActive')
            .sort({ createdAt: -1 })
            .lean();

        const rows = organisers.map((organiser) => ({
            id: organiser._id,
            name: organiser.name,
            category: organiser.category,
            description: organiser.description,
            contactEmail: organiser.contactEmail,
            contactNumber: organiser.contactNumber,
            status: organiser.status,
            loginEmail: organiser.userId?.email || ''
        }));

        return res.json({ organisers: rows });
    } catch (error) {
        return next(error);
    }
};

const getDashboardStats = async (req, res, next) => {
    try {
        const [active, disabled, archived, participants, openResets] = await Promise.all([
            Organiser.countDocuments({ status: 'active' }),
            Organiser.countDocuments({ status: 'disabled' }),
            Organiser.countDocuments({ status: 'archived' }),
            Participant.countDocuments({}),
            PasswordResetRequest.countDocuments({ status: 'open' })
        ]);

        return res.json({
            stats: {
                active,
                disabled,
                archived,
                participants,
                openResets
            }
        });
    } catch (error) {
        return next(error);
    }
};

const createOrganiser = async (req, res, next) => {
    const parsed = organiserSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid organiser payload' });
    }

    try {
        const loginEmail = await generateOrganiserEmail(parsed.data.name);
        const password = generatePassword();
        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = new User({
            email: loginEmail,
            password: hashedPassword,
            role: 'organiser',
            isActive: true
        });
        await user.save();

        const organiser = new Organiser({
            userId: user._id,
            name: parsed.data.name,
            category: parsed.data.category,
            description: parsed.data.description || '',
            contactEmail: parsed.data.contactEmail || '',
            contactNumber: parsed.data.contactNumber || '',
            discordWebhook: parsed.data.discordWebhook || '',
            status: 'active'
        });
        await organiser.save();

        return res.status(201).json({
            organiser,
            credentials: { email: loginEmail, password }
        });
    } catch (error) {
        return next(error);
    }
};

const updateOrganiserStatus = async (req, res, next) => {
    const parsed = statusSchema.safeParse(req.body || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid status payload' });
    }

    try {
        const organiser = await Organiser.findById(req.params.id);
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        organiser.status = parsed.data.status;
        await organiser.save();

        await User.findByIdAndUpdate(organiser.userId, {
            isActive: parsed.data.status === 'active'
        });

        return res.json({ organiser });
    } catch (error) {
        return next(error);
    }
};

const deleteOrganiser = async (req, res, next) => {
    try {
        const organiser = await Organiser.findById(req.params.id);
        if (!organiser) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        const events = await Event.find({ organiserId: organiser._id }).select('_id').lean();
        const eventIds = events.map((event) => event._id);
        if (eventIds.length) {
            await Registration.deleteMany({ eventId: { $in: eventIds } });
            await Ticket.deleteMany({ eventId: { $in: eventIds } });
            await Event.deleteMany({ organiserId: organiser._id });
        }

        await Organiser.deleteOne({ _id: organiser._id });
        await User.deleteOne({ _id: organiser.userId });

        return res.json({ message: 'Organiser deleted' });
    } catch (error) {
        return next(error);
    }
};

const listResetRequests = async (req, res, next) => {
    try {
        const requests = await PasswordResetRequest.find({ status: 'open' })
            .populate({ path: 'organiserId', populate: { path: 'userId', select: 'email' } })
            .sort({ createdAt: -1 })
            .lean();

        const rows = requests.map((request) => ({
            id: request._id,
            organiserId: request.organiserId?._id,
            organiserName: request.organiserId?.name || 'Organizer',
            loginEmail: request.organiserId?.userId?.email || '',
            createdAt: request.createdAt
        }));

        return res.json({ requests: rows });
    } catch (error) {
        return next(error);
    }
};

const resetOrganiserPassword = async (organiserId) => {
    const organiser = await Organiser.findById(organiserId).populate('userId', 'email');
    if (!organiser) {
        return null;
    }

    const password = generatePassword();
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await User.findByIdAndUpdate(organiser.userId._id, { password: hashedPassword, isActive: true });

    return {
        organiser,
        credentials: {
            email: organiser.userId?.email || '',
            password
        }
    };
};

const resolveResetRequest = async (req, res, next) => {
    try {
        const request = await PasswordResetRequest.findById(req.params.id);
        if (!request || request.status !== 'open') {
            return res.status(404).json({ message: 'Request not found' });
        }

        const result = await resetOrganiserPassword(request.organiserId);
        if (!result) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        request.status = 'resolved';
        request.resolvedAt = new Date();
        await request.save();

        return res.json({
            organiser: result.organiser,
            credentials: result.credentials
        });
    } catch (error) {
        return next(error);
    }
};

const forceResetPassword = async (req, res, next) => {
    try {
        const result = await resetOrganiserPassword(req.params.id);
        if (!result) {
            return res.status(404).json({ message: 'Organiser not found' });
        }

        return res.json({
            organiser: result.organiser,
            credentials: result.credentials
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getDashboardStats,
    listOrganisers,
    createOrganiser,
    updateOrganiserStatus,
    deleteOrganiser,
    listResetRequests,
    resolveResetRequest,
    forceResetPassword
};
