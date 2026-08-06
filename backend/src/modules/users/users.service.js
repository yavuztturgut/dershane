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
        is_active: query.is_active === 'true' ? true : query.is_active === 'false' ? false : undefined,
        sort: query.sort,
        order: query.order
    };
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

async function validateUserData(data, isCreate = false) {
    if (isCreate && (!data.role_id || !data.name || !data.email || !data.password)) {
        throw createHttpError('Missing required fields', 400);
    }
    if (data.password && data.password.length < 8) {
        throw createHttpError('Password must contain at least 8 characters', 400, 'PASSWORD_TOO_SHORT');
    }
    if (data.role_id) {
        const roleName = await usersRepository.findRoleNameById(data.role_id);
        if (!roleName) throw createHttpError('Invalid role', 400, 'INVALID_REFERENCE');
        if (roleName === 'student' && !data.class_id) {
            throw createHttpError('Student class is required', 400, 'STUDENT_CLASS_REQUIRED');
        }
    }
}

async function getUserById(id) {
    const user = await usersRepository.findUserById(id);

    if (!user) {
        throw createHttpError('User not found', 404);
    }

    return user;
}

async function createUser(data) {
    const { role_id, class_id, name, email, password } = data;
    await validateUserData(data, true);

    const hashedPassword = await bcrypt.hash(password, 10);

    return usersRepository.insertUser({
        role_id,
        class_id,
        name,
        email,
        password: hashedPassword
    });
}

async function updateUser(id, data) {
    await validateUserData(data);
    const existingUser = await usersRepository.findUserWithPasswordById(id);

    if (!existingUser) {
        throw createHttpError('User not found', 404);
    }

    let hashedPassword = existingUser.password;
    const passwordChanged = Boolean(data.password);

    if (data.password) {
        hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const classId = data.class_id === undefined ? existingUser.class_id : data.class_id;

    const user = await usersRepository.updateUserById(id, {
        role_id: data.role_id,
        class_id: classId,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        is_active: data.is_active,
        passwordChanged
    });
    authStateCache.invalidate(id);
    return user;
}

async function deleteUser(id) {
    const user = await usersRepository.deleteUserById(id);

    if (!user) {
        throw createHttpError('User not found', 404);
    }

    authStateCache.invalidate(id);
    return user;
}

module.exports = {
    getUsers,
    getUserOptions,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
