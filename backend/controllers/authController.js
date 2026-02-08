const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Organiser = require('../models/Organiser');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

const signupSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    participantType: z.enum(['internal', 'external']),
    organisation: z.string().optional(),
    contactNumber: z.string().min(1)
});

//func=> email,pw => validate => generate token
const loginController = async (req, res, next) => {
    const parseLogin = loginSchema.safeParse(req.body);
    if (!parseLogin.success) {
        return res.status(400).json({ message: 'Invalid login payload' });
    }
    const { email, password } = parseLogin.data;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        res.json({ token, role: user.role });
    } catch (error) {
        return next(error);
    }
};

//func=> register new user => validate input => hash pw => save user + participant
const signupController = async (req, res, next) => {
    const parseSignup = signupSchema.safeParse(req.body);
    if (!parseSignup.success) {
        return res.status(400).json({ message: 'Invalid signup payload' });
    }
    const { firstName, lastName, email, password, participantType, organisation, contactNumber } = parseSignup.data;

    try {
        if (!firstName || !lastName || !email || !password || !participantType || !contactNumber) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        if (!['internal', 'external'].includes(participantType)) {
            return res.status(400).json({ message: 'Invalid participant type' });
        }
        if (participantType === 'external' && (!organisation)) {
            return res.status(400).json({ message: 'Organisation is required for external participants' });
        }
        if (participantType === 'internal'){
            if (!(email.endsWith('@iiit.ac.in') || email.endsWith('@research.iiit.ac.in') || email.endsWith('@students.iiit.ac.in'))) {
                return res.status(400).json({ message: 'Internal participants must have an IIIT email address' });
            }
        }

        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const newUser = new User({ email: email, password: hashedPassword });
        await newUser.save();

        const newParticipant = new Participant({
            userId: newUser._id,
            firstName,
            lastName,
            participantType,
            organisation: participantType === 'external' ? organisation : "IIIT",
            contactNumber: contactNumber
        });
        await newParticipant.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        return next(error);
    }
};

//func => get current user details (except pw) + participant details
const meController = async(req,res,next) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        let profile = null;
        if (user.role === 'participant') {
            profile = await Participant.findOne({ userId: user._id });
        } else if (user.role === 'organiser') {
            profile = await Organiser.findOne({ userId: user._id });
        }
        res.json({ user, role: user.role, profile });
    } catch (error) {
        return next(error);
    }
}


module.exports = { loginController, signupController, meController };