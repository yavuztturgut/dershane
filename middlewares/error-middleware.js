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

function getDuplicateCode(error) {
    const constraint = error.constraint || '';
    if (constraint.includes('users_email')) return 'EMAIL_EXISTS';
    if (constraint.includes('roles_name')) return 'ROLE_EXISTS';
    if (constraint.includes('classes')) return 'CLASS_NAME_EXISTS';
    if (constraint.includes('courses')) return 'COURSE_NAME_EXISTS';
    return 'DUPLICATE_RECORD';
}

function getErrorCode(error) {
    return error.errorCode || ({
        'User not found': 'USER_NOT_FOUND',
        'Role not found': 'ROLE_NOT_FOUND',
        'Class not found': 'CLASS_NOT_FOUND',
        'Course not found': 'COURSE_NOT_FOUND',
        'Schedule not found': 'SCHEDULE_NOT_FOUND',
        'Missing required fields': 'REQUIRED_FIELDS',
        'Role name is required': 'ROLE_NAME_REQUIRED',
        'Class name is required': 'CLASS_NAME_REQUIRED',
        'Course name is required': 'COURSE_NAME_REQUIRED',
        'Email and password are required': 'AUTH_CREDENTIALS_REQUIRED',
        'Invalid email or password': 'INVALID_CREDENTIALS',
        'User is inactive': 'USER_INACTIVE',
    })[error.message];
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
        return res.status(409).json({ error: getDuplicateMessage(error), errorCode: getDuplicateCode(error) });
    }

    if (error.code === '23503') {
        const statusCode = req.method === 'DELETE' ? 409 : 400;
        return res.status(statusCode).json({ error: getForeignKeyMessage(req), errorCode: req.method === 'DELETE' ? 'RECORD_IN_USE' : 'INVALID_REFERENCE' });
    }

    if (error.code === '23514') {
        return res.status(400).json({ error: 'end_time must be greater than start_time', errorCode: 'SCHEDULE_END_BEFORE_START' });
    }

    if (error.statusCode) {
        return res.status(error.statusCode).json({
            error: error.message,
            errorCode: getErrorCode(error) || 'REQUEST_FAILED',
            ...(error.details ? { details: error.details } : {})
        });
    }

    return res.status(500).json({ error: 'Internal server error', errorCode: 'INTERNAL_ERROR' });
}

module.exports = errorMiddleware;
