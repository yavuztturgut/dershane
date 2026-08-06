const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const userRoutes = require('./modules/users/users.route');
const courseRoutes = require('./modules/courses/courses.route');
const roleRoutes = require('./modules/roles/roles.route');
const classRoutes = require('./modules/classes/classes.route');
const authRoutes = require('./modules/auth/auth.route');
const scheduleRoutes = require('./modules/schedules/schedules.route');
const dashboardRoutes = require('./modules/dashboard/dashboard.route');
const attendanceRoutes = require('./modules/attendance/attendance.route');
const lookupRoutes = require('./modules/lookups/lookups.route');
const errorMiddleware = require('./http/middleware/error-middleware');
const app = express();

const allowedOrigins = new Set([
    'http://localhost:5173',
    process.env.CLIENT_URL?.replace(/\/$/, '')
].filter(Boolean));

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/classes", classRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/lookups', lookupRoutes);

app.use(errorMiddleware);

module.exports = app;
