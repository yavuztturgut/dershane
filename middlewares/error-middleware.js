function getDuplicateMessage(error) {
    const constraint = error.constraint || '';

    if (constraint.includes('users_email')) {
        return 'Email already exists';
    }

    if (constraint.includes('roles_name')) {
        return 'Role already exists';
    }

    if (constraint.includes('classes_name')) {
        return 'Class already exists';
    }

    if (constraint.includes('courses_name')) {
        return 'Course name already exists';
    }

    return 'Duplicate record';
}

function getForeignKeyMessage(req) {
    if (req.method === 'DELETE') {
        if (req.originalUrl.includes('/roles')) {
            return 'Role is used by users and cannot be deleted';
        }

        if (req.originalUrl.includes('/classes')) {
            return 'Class is used by users or schedules and cannot be deleted';
        }

        if (req.originalUrl.includes('/courses')) {
            return 'Course is used in schedules and cannot be deleted';
        }

        return 'Record is used by another record and cannot be deleted';
    }

    if (req.originalUrl.includes('/users')) {
        return 'Invalid role_id or class_id';
    }

    if (req.originalUrl.includes('/schedules')) {
        return 'Invalid course_id, class_id or teacher_id';
    }

    return 'Invalid referenced record';
}

function errorMiddleware(error, req, res, next) {
    console.error(error);

    if (error.code === '23505') {
        return res.status(409).json({ error: getDuplicateMessage(error) });
    }

    if (error.code === '23503') {
        const statusCode = req.method === 'DELETE' ? 409 : 400;
        return res.status(statusCode).json({ error: getForeignKeyMessage(req) });
    }

    if (error.code === '23514') {
        return res.status(400).json({ error: 'end_time must be greater than start_time' });
    }

    if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorMiddleware;
