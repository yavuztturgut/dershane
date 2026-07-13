const express = require('express');
const userRoutes = require('./routes/users-routes');
const courseRoutes = require('./routes/courses-routes');
const roleRoutes = require('./routes/roles-routes');
const classRoutes = require('./routes/classes-routes');
const authRoutes = require('./routes/auth-routes');
const scheduleRoutes = require('./routes/schedule-routes');
const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/classes", classRoutes);
app.use('/api/schedules', scheduleRoutes);

module.exports = app;