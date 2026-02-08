const express = require('express');
const cors = require('cors'); //for cross-origin requests
const helmet = require('helmet'); //for security headers
const connectDB = require('./config/db'); //database connection
const authRoutes = require('./routes/authRoute'); //auth routes
const participantRoutes = require('./routes/participantRoute');
const errorHandler = require('./middleware/errorHandler');

const dotenv = require('dotenv'); //for environment variables
dotenv.config(); //load from .env

const app = express();

const PORT = process.env.PORT || 5000;
//connect to database
connectDB();

//middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

//routes
app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);

//error handler
app.use(errorHandler);

//start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});