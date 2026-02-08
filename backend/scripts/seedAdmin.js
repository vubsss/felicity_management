const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');

dotenv.config();

const seedAdmin = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env');
    }

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
        console.log('Admin already exists');
        return;
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const adminUser = new User({
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
    });

    await adminUser.save();
    console.log('Admin seeded successfully');
};

const run = async () => {
    try {
        await connectDB();
        await seedAdmin();
    } catch (err) {
        console.error(err.message || err);
        process.exit(1);
    } finally {
        process.exit(0);
    }
};

run();
