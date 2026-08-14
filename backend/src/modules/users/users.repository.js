const pool = require('../../database/pool');
const { lockClasses, withTransaction } = require('../../database/transaction');
const createHttpError = require('../../utils/create-http-error');
const rosterRepository = require('../schedule-roster/schedule-roster.repository');

async function findAllUsers(filters = {}) {
    const params = [];
    const conditions = [];
    if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    for (const [column, value] of [['role_id', filters.role_id], ['class_id', filters.class_id], ['status', filters.status]]) {
        if (value !== undefined && value !== '') {
            params.push(value);
            conditions.push(`u.${column} = $${params.length}`);
        }
    }
    if (filters.status === undefined) conditions.push('u.status <> -1');

    const where = `WHERE ${conditions.join(' AND ')}`;
    const sortColumns = { id: 'u.id', name: 'u.name', email: 'u.email', created_at: 'u.created_at' };
    const sort = sortColumns[filters.sort] || 'u.id';
    const order = filters.order === 'desc' ? 'DESC' : 'ASC';
    const countParams = [...params];
    params.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
    const [result, countResult] = await Promise.all([
        pool.query(
            `SELECT u.id, u.role_id, u.class_id, u.name, u.email, u.status, u.created_at, u.updated_at
             FROM users u ${where}
             ORDER BY ${sort} ${order}
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        ),
        pool.query(`SELECT COUNT(*)::INTEGER AS total FROM users u ${where}`, countParams)
    ]);
    return { items: result.rows, total: countResult.rows[0].total };
}

async function findUserIds(filters = {}, limit = 1001) {
    const params = [];
    const conditions = [];
    if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    for (const [column, value] of [['role_id', filters.role_id], ['class_id', filters.class_id], ['status', filters.status]]) {
        if (value !== undefined && value !== '') {
            params.push(value);
            conditions.push(`u.${column} = $${params.length}`);
        }
    }
    if (filters.status === undefined) conditions.push('u.status <> -1');
    if (filters.excludedIds?.length) {
        params.push(filters.excludedIds);
        conditions.push(`NOT (u.id = ANY($${params.length}::INTEGER[]))`);
    }
    params.push(limit);
    const result = await pool.query(
        `SELECT u.id FROM users u WHERE ${conditions.join(' AND ')} ORDER BY u.id LIMIT $${params.length}`,
        params
    );
    return result.rows.map((row) => Number(row.id));
}

async function findRoleNameById(id, db = pool) {
    const result = await db.query('SELECT name FROM roles WHERE id = $1', [id]);
    return result.rows[0]?.name;
}

async function findUserOptions({ role, classId }) {
    const params = [role];
    let classFilter = '';
    if (classId !== undefined) {
        params.push(classId);
        classFilter = 'AND u.class_id = $2';
    }
    const result = await pool.query(
        `SELECT u.id, u.name, u.class_id
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.name = $1 AND u.status = 1 ${classFilter}
         ORDER BY u.name ASC, u.id ASC`,
        params
    );
    return result.rows;
}

async function findUserById(id, db = pool) {
    const result = await db.query(
        `SELECT id, role_id, class_id, name, email, status, created_at, updated_at
         FROM users WHERE id = $1`,
        [id]
    );
    return result.rows[0];
}

async function findUserWithPasswordById(id, db = pool, forUpdate = false) {
    const result = await db.query(
        `SELECT u.id, u.role_id, role.name AS role_name, u.password, u.class_id, u.status
         FROM users u
         JOIN roles role ON role.id = u.role_id
         WHERE u.id = $1 ${forUpdate ? 'FOR UPDATE OF u' : ''}`,
        [id]
    );
    return result.rows[0];
}

async function insertUser(data, db = pool) {
    const result = await db.query(
        `INSERT INTO users (role_id, class_id, name, email, password)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [data.role_id, data.class_id || null, data.name, data.email, data.password]
    );
    return result.rows[0];
}

async function updateUserById(id, data, db = pool) {
    const result = await db.query(
        `UPDATE users
         SET role_id = COALESCE($1, role_id), class_id = $2, name = COALESCE($3, name),
             email = COALESCE($4, email), password = COALESCE($5, password),
             status = COALESCE($6, status),
             token_version = token_version + CASE WHEN $7 OR ($6 IS NOT NULL AND $6 <> status) THEN 1 ELSE 0 END,
             updated_at = NOW()
         WHERE id = $8
         RETURNING id, role_id, class_id, name, email, status, created_at, updated_at`,
        [data.role_id, data.class_id, data.name, data.email, data.password, data.status, data.passwordChanged, id]
    );
    return result.rows[0];
}

async function assertAdminCanBecomeUnavailable(client, existing, actorId) {
    if (existing.role_name !== 'admin' || existing.status !== 1) return;
    if (Number(existing.id) === Number(actorId)) {
        throw createHttpError('You cannot deactivate or delete your own account', 409, 'SELF_ACCOUNT_STATUS_CHANGE');
    }
    const activeAdmins = await client.query(
        `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
         WHERE r.name = 'admin' AND u.status = 1 ORDER BY u.id FOR UPDATE OF u`
    );
    if (activeAdmins.rowCount <= 1) {
        throw createHttpError('The last active admin cannot be deactivated or deleted', 409, 'LAST_ACTIVE_ADMIN');
    }
}

async function insertUserWithRoster(data, roleName) {
    return withTransaction(async (client) => {
        if (roleName === 'student') await lockClasses(client, [data.class_id]);
        const user = await insertUser(data, client);
        await rosterRepository.syncStudentFutureSchedules(client, user.id, {
            roleName, classId: data.class_id, isActive: true
        });
        return findUserById(user.id, client);
    });
}

async function updateUserWithRoster(id, data, actorId) {
    return withTransaction(async (client) => {
        const existing = await findUserWithPasswordById(id, client, true);
        if (!existing || existing.status === -1) return undefined;

        const roleId = data.role_id ?? existing.role_id;
        const roleName = roleId === existing.role_id ? existing.role_name : await findRoleNameById(roleId, client);
        const classId = data.class_id === undefined ? existing.class_id : data.class_id;
        const status = data.status === undefined ? existing.status : data.status;
        if (status === 0 || (existing.role_name === 'admin' && roleName !== 'admin')) {
            await assertAdminCanBecomeUnavailable(client, existing, actorId);
        }

        await lockClasses(client, [existing.class_id, classId]);
        const user = await updateUserById(id, { ...data, role_id: roleId, class_id: classId, status }, client);
        await rosterRepository.syncStudentFutureSchedules(client, id, {
            roleName, classId, isActive: status === 1
        });
        return user;
    });
}

async function archiveUser(id, actorId) {
    return withTransaction(async (client) => {
        const existing = await findUserWithPasswordById(id, client, true);
        if (!existing || existing.status === -1) return undefined;
        await assertAdminCanBecomeUnavailable(client, existing, actorId);

        if (existing.role_name === 'teacher') {
            const futureSchedule = await client.query(
                'SELECT 1 FROM schedules WHERE teacher_id = $1 AND start_time > NOW() LIMIT 1',
                [id]
            );
            if (futureSchedule.rowCount) {
                throw createHttpError('Teacher has future schedules', 409, 'TEACHER_HAS_FUTURE_SCHEDULES');
            }
        }

        await lockClasses(client, [existing.class_id]);
        const user = await updateUserById(id, {
            role_id: existing.role_id, class_id: existing.class_id, password: existing.password,
            status: -1, passwordChanged: false
        }, client);
        await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [id]);
        await rosterRepository.syncStudentFutureSchedules(client, id, {
            roleName: existing.role_name, classId: existing.class_id, isActive: false
        });
        return user;
    });
}

async function restoreUser(id) {
    return withTransaction(async (client) => {
        const existing = await findUserWithPasswordById(id, client, true);
        if (!existing) return undefined;
        if (existing.status !== -1) {
            throw createHttpError('Only deleted users can be restored', 409, 'USER_NOT_DELETED');
        }
        await lockClasses(client, [existing.class_id]);
        const user = await updateUserById(id, {
            role_id: existing.role_id, class_id: existing.class_id, password: existing.password,
            status: 1, passwordChanged: false
        }, client);
        await rosterRepository.syncStudentFutureSchedules(client, id, {
            roleName: existing.role_name, classId: existing.class_id, isActive: true
        });
        return user;
    });
}

async function getBulkCandidates(ids, action, actorId, db = pool, lock = false) {
    if (action.type === 'assign_class') {
        const classResult = await db.query('SELECT id FROM classes WHERE id = $1', [action.class_id]);
        if (!classResult.rowCount) throw createHttpError('Class not found', 404, 'CLASS_NOT_FOUND');
    }
    const result = await db.query(
        `SELECT u.id, u.role_id, role.name AS role_name, u.password, u.class_id, u.status
         FROM users u JOIN roles role ON role.id = u.role_id
         WHERE u.id = ANY($1::INTEGER[]) ORDER BY u.id ${lock ? 'FOR UPDATE OF u' : ''}`,
        [ids]
    );
    let futureTeacherIds = new Set();
    if (action.type === 'delete') {
        const teacherIds = result.rows.filter((user) => user.role_name === 'teacher').map((user) => user.id);
        if (teacherIds.length) {
            const future = await db.query(
                'SELECT DISTINCT teacher_id FROM schedules WHERE teacher_id = ANY($1::INTEGER[]) AND start_time > NOW()',
                [teacherIds]
            );
            futureTeacherIds = new Set(future.rows.map((row) => Number(row.teacher_id)));
        }
    }
    const eligible = result.rows.filter((user) => {
        if (action.type === 'activate') return user.status === 0;
        if (action.type === 'deactivate') return user.status === 1 && Number(user.id) !== Number(actorId);
        if (action.type === 'assign_class') return user.status !== -1 && user.role_name === 'student' && Number(user.class_id) !== action.class_id;
        if (action.type === 'delete') return user.status !== -1 && Number(user.id) !== Number(actorId) && !futureTeacherIds.has(Number(user.id));
        return action.type === 'restore' && user.status === -1;
    });
    return { selected: ids.length, eligible, skipped: ids.length - eligible.length };
}

async function previewBulkUsers(ids, action, actorId) {
    const result = await getBulkCandidates(ids, action, actorId);
    return { selected: result.selected, eligible: result.eligible.length, skipped: result.skipped };
}

async function applyBulkUsers(ids, action, actorId) {
    return withTransaction(async (client) => {
        const result = await getBulkCandidates(ids, action, actorId, client, true);
        const classIds = result.eligible.flatMap((user) => [user.class_id, action.type === 'assign_class' ? action.class_id : null]);
        await lockClasses(client, classIds);
        const appliedIds = [];
        for (const existing of result.eligible) {
            const classId = action.type === 'assign_class' ? action.class_id : existing.class_id;
            const status = action.type === 'activate' || action.type === 'restore' ? 1
                : action.type === 'deactivate' ? 0
                    : action.type === 'delete' ? -1 : existing.status;
            await updateUserById(existing.id, {
                role_id: existing.role_id,
                class_id: classId,
                password: existing.password,
                status,
                passwordChanged: false
            }, client);
            if (action.type === 'delete') {
                await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [existing.id]);
            }
            await rosterRepository.syncStudentFutureSchedules(client, existing.id, {
                roleName: existing.role_name,
                classId,
                isActive: status === 1
            });
            appliedIds.push(Number(existing.id));
        }
        return { selected: result.selected, applied_ids: appliedIds, skipped: result.skipped };
    });
}

module.exports = {
    findAllUsers, findUserOptions, findUserById, findUserWithPasswordById, insertUser,
    updateUserById, findRoleNameById, insertUserWithRoster, updateUserWithRoster,
    archiveUser, restoreUser, findUserIds, previewBulkUsers, applyBulkUsers
};
