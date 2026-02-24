const express = require('express');
const cors = require('cors'); //for cross-origin requests
const helmet = require('helmet'); //for security headers
const http = require('http');
const { Server } = require('socket.io');
const jwttoken = require('jsonwebtoken');
const connectDB = require('./config/db'); //database connection
const authRoutes = require('./routes/authRoute'); //auth routes
const participantRoutes = require('./routes/participantRoute');
const eventRoutes = require('./routes/eventRoute');
const organiserRoutes = require('./routes/organiserRoute');
const adminRoutes = require('./routes/adminRoute');
const { registerForumSocketHandlers } = require('./socket/forumSocket');
const { setIo } = require('./utils/socket');
const User = require('./models/User');
const errorHandler = require('./middleware/errorHandler');

const dotenv = require('dotenv'); //for environment variables
dotenv.config(); //load from .env

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

setIo(io);

io.use(async (socket, next) => {
    try {
        const token = socket.handshake?.auth?.token;
        if (!token) {
            return next(new Error('Unauthorized'));
        }
        const decoded = jwttoken.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('_id role isActive').lean();
        if (!user || user.isActive === false) {
            return next(new Error('Unauthorized'));
        }
        socket.user = { userId: user._id, role: user.role };
        return next();
    } catch (error) {
        return next(new Error('Unauthorized'));
    }
});

io.on('connection', (socket) => {
    registerForumSocketHandlers(io, socket);
});

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
app.use('/api/events', eventRoutes);
app.use('/api/organisers', organiserRoutes);
app.use('/api/admin', adminRoutes);

//error handler
app.use(errorHandler);

//start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});