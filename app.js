const express = require('express');
const userRoutes = require('./components/users/users.route');
const courseRoutes = require('./components/courses/courses.route');
const roleRoutes = require('./components/roles/roles.route');
const classRoutes = require('./components/classes/classes.route');
const authRoutes = require('./components/auth/auth.route');
const scheduleRoutes = require('./components/schedules/schedules.route');
const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/classes", classRoutes);
app.use('/api/schedules', scheduleRoutes);

module.exports = app;
