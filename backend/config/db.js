const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config(); //load environment variables

//func: database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1); //exit with failure
    }
};

module.exports = connectDB;