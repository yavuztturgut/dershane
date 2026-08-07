const bcrypt = require('bcrypt');
const usersRepository = require('./users.repository');
const createHttpError = require('../../utils/create-http-error');
const authStateCache = require('../auth/auth-state-cache');

const optionRoles = new Set(['student', 'teacher']);

async function getUsers(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const filters = {
        page,
        pageSize,
        search: String(query.search || '').trim(),
        role_id: query.role_id ? Number(query.role_id) : undefined,
        class_id: query.class_id ? Number(query.class_id) : undefined,
        status: query.status === undefined || query.status === '' ? undefined : Number(query.status),
        sort: query.sort,
        order: query.order
    };
    if (filters.status !== undefined && ![-1, 0, 1].includes(filters.status)) {
        throw createHttpError('status must be -1, 0 or 1', 400, 'INVALID_USER_STATUS');
    }
    const { items, total } = await usersRepository.findAllUsers(filters);
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

async function getUserOptions(query = {}) {
    const role = String(query.role || '').trim().toLowerCase();
    if (!optionRoles.has(role)) {
        throw createHttpError('role must be student or teacher', 400, 'INVALID_USER_OPTION_ROLE');
    }

    let classId;
    if (query.class_id !== undefined && query.class_id !== '') {
        classId = Number(query.class_id);
        if (!Number.isInteger(classId) || classId <= 0) {
            throw createHttpError('class_id is invalid', 400, 'INVALID_CLASS');
        }
    }

    return usersRepository.findUserOptions({ role, classId });
}

async function validateUserData(data, isCreate = false, existingUser) {
    if (isCreate && (!data.role_id || !data.name || !data.email || !data.password)) {
        throw createHttpError('Missing required fields', 400);
    }
    if (data.password && data.password.length < 8) {
        throw createHttpError('Password must contain at least 8 characters', 400, 'PASSWORD_TOO_SHORT');
    }
    const roleId = data.role_id || existingUser?.role_id;
    if (roleId) {
        const roleName = data.role_id
            ? await usersRepository.findRoleNameById(data.role_id)
            : existingUser.role_name;
        if (!roleName) throw createHttpError('Invalid role', 400, 'INVALID_REFERENCE');
        const classId = data.class_id === undefined ? existingUser?.class_id : data.class_id;
        if (roleName === 'student' && !classId) {
            throw createHttpError('Student class is required', 400, 'STUDENT_CLASS_REQUIRED');
        }
        return roleName;
    }
}

async function getUserById(id) {
    const user = await usersRepository.findUserById(id);

    if (!user || user.status === -1) {
        throw createHttpError('User not found', 404);
    }

    return user;
}

async function createUser(data) {
    const { role_id, class_id, name, email, password } = data;
    const roleName = await validateUserData(data, true);

    const hashedPassword = await bcrypt.hash(password, 10);

    return usersRepository.insertUserWithRoster({
        role_id,
        class_id,
        name,
        email,
        password: hashedPassword
    }, roleName);
}

async function updateUser(id, data, actorId) {
    const existingUser = await usersRepository.findUserWithPasswordById(id);

    if (!existingUser || existingUser.status === -1) {
        throw createHttpError('User not found', 404);
    }

    if (data.status !== undefined && (!Number.isInteger(data.status) || ![0, 1].includes(data.status))) {
        throw createHttpError('status must be 0 or 1', 400, 'INVALID_USER_STATUS');
    }

    await validateUserData(data, false, existingUser);

    let hashedPassword;
    const passwordChanged = Boolean(data.password);

    if (data.password) {
        hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const classId = data.class_id === undefined ? existingUser.class_id : data.class_id;

    const user = await usersRepository.updateUserWithRoster(id, {
        role_id: data.role_id,
        class_id: classId,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        status: data.status,
        passwordChanged
    }, actorId);
    authStateCache.invalidate(id);
    return user;
}

async function deleteUser(id, actorId) {
    const user = await usersRepository.archiveUser(id, actorId);

    if (!user) {
        throw createHttpError('User not found', 404);
    }

    authStateCache.invalidate(id);
    return user;
}

async function restoreUser(id) {
    const user = await usersRepository.restoreUser(id);
    if (!user) throw createHttpError('User not found', 404, 'USER_NOT_FOUND');
    authStateCache.invalidate(id);
    return user;
}

module.exports = {
    getUsers,
    getUserOptions,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    restoreUser
};
