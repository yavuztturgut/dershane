const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const userRoutes = require('./components/users/users.route');
const courseRoutes = require('./components/courses/courses.route');
const roleRoutes = require('./components/roles/roles.route');
const classRoutes = require('./components/classes/classes.route');
const authRoutes = require('./components/auth/auth.route');
const scheduleRoutes = require('./components/schedules/schedules.route');
const dashboardRoutes = require('./components/dashboard/dashboard.route');
const attendanceRoutes = require('./components/attendance/attendance.route');
const lookupRoutes = require('./components/lookups/lookups.route');
const errorMiddleware = require('./middlewares/error-middleware');
const app = express();

const allowedOrigins = new Set([
    'http://localhost:5173',
    'https://dershane-frontend-ten.vercel.app',
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
