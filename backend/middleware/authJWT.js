const jwttoken = require('jsonwebtoken');
const User = require('../models/User');
const Organiser = require('../models/Organiser');

const authJWT = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access token missing' });
    }
    try {
        const decoded = jwttoken.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Check if user account is disabled
        if (user.isActive === false) {
            return res.status(403).json({ message: 'Your account has been disabled. Contact an administrator.' });
        }

        // Check organiser status
        if (user.role === 'organiser') {
            const organiser = await Organiser.findOne({ userId: user._id });
            if (!organiser) {
                return res.status(403).json({ message: 'Organiser profile not found' });
            }
            if (organiser.status === 'disabled') {
                return res.status(403).json({ message: 'Your organiser account has been disabled. Contact an administrator.' });
            }
            if (organiser.status === 'archived') {
                return res.status(403).json({ message: 'Your organiser account has been archived and is no longer accessible.' });
            }
        }

        req.user = { userId: user._id, role: user.role };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authJWT;