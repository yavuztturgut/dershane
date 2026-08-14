const bcrypt = require('bcrypt');
const usersRepository = require('./users.repository');
const createHttpError = require('../../utils/create-http-error');
const authStateCache = require('../auth/auth-state-cache');

const optionRoles = new Set(['student', 'teacher']);
const bulkActions = new Set(['activate', 'deactivate', 'assign_class', 'delete', 'restore']);
const bulkLimit = 1000;

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

function normalizeIds(values, field = 'ids') {
    if (!Array.isArray(values)) throw createHttpError(`${field} must be an array`, 400, 'INVALID_BULK_SELECTION');
    const ids = [...new Set(values.map(Number))];
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw createHttpError(`${field} contains an invalid user id`, 400, 'INVALID_BULK_SELECTION');
    }
    return ids;
}

function normalizeBulkAction(action = {}) {
    if (!bulkActions.has(action.type)) {
        throw createHttpError('Invalid bulk action', 400, 'INVALID_BULK_ACTION');
    }
    if (action.type !== 'assign_class') return { type: action.type };
    const classId = Number(action.class_id);
    if (!Number.isInteger(classId) || classId <= 0) {
        throw createHttpError('class_id is invalid', 400, 'INVALID_CLASS');
    }
    return { type: action.type, class_id: classId };
}

async function resolveBulkSelection(selector = {}) {
    if (selector.type === 'ids') {
        const ids = normalizeIds(selector.ids);
        if (!ids.length) throw createHttpError('Select at least one user', 400, 'INVALID_BULK_SELECTION');
        if (ids.length > bulkLimit) throw createHttpError('Bulk selection exceeds 1000 users', 422, 'BULK_SELECTION_LIMIT_EXCEEDED');
        return ids;
    }
    if (selector.type !== 'filter') throw createHttpError('Invalid bulk selector', 400, 'INVALID_BULK_SELECTION');

    const source = selector.filters || {};
    const filters = { search: String(source.search || '').trim() };
    for (const key of ['role_id', 'class_id']) {
        if (source[key] === undefined || source[key] === '') continue;
        const value = Number(source[key]);
        if (!Number.isInteger(value) || value <= 0) throw createHttpError(`${key} is invalid`, 400, 'INVALID_BULK_SELECTION');
        filters[key] = value;
    }
    if (source.status !== undefined && source.status !== '') {
        filters.status = Number(source.status);
        if (![-1, 0, 1].includes(filters.status)) throw createHttpError('status is invalid', 400, 'INVALID_USER_STATUS');
    }
    filters.excludedIds = normalizeIds(selector.excluded_ids || [], 'excluded_ids');
    if (filters.excludedIds.length > bulkLimit) throw createHttpError('Bulk exclusions exceed 1000 users', 422, 'BULK_SELECTION_LIMIT_EXCEEDED');
    const ids = await usersRepository.findUserIds(filters, bulkLimit + 1);
    if (!ids.length) throw createHttpError('Select at least one user', 400, 'INVALID_BULK_SELECTION');
    if (ids.length > bulkLimit) throw createHttpError('Bulk selection exceeds 1000 users', 422, 'BULK_SELECTION_LIMIT_EXCEEDED');
    return ids;
}

async function previewBulkUsers(data, actorId) {
    const action = normalizeBulkAction(data?.action);
    const ids = await resolveBulkSelection(data?.selector);
    const result = await usersRepository.previewBulkUsers(ids, action, actorId);
    return { ...result, resolved_ids: ids };
}

async function applyBulkUsers(data, actorId) {
    const action = normalizeBulkAction(data?.action);
    const ids = await resolveBulkSelection({ type: 'ids', ids: data?.resolved_ids });
    const result = await usersRepository.applyBulkUsers(ids, action, actorId);
    result.applied_ids.forEach((id) => authStateCache.invalidate(id));
    return { selected: result.selected, applied: result.applied_ids.length, skipped: result.skipped };
}

module.exports = {
    getUsers,
    getUserOptions,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    restoreUser,
    previewBulkUsers,
    applyBulkUsers
};
