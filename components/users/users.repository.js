const pool = require('../../db/pool');

async function findAllUsers(filters = {}) {
    const params = [];
    const conditions = [];
    if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    for (const [column, value] of [['role_id', filters.role_id], ['class_id', filters.class_id], ['is_active', filters.is_active]]) {
        if (value !== undefined && value !== '') {
            params.push(value);
            conditions.push(`u.${column} = $${params.length}`);
        }
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortColumns = { id: 'u.id', name: 'u.name', email: 'u.email', created_at: 'u.created_at' };
    const sort = sortColumns[filters.sort] || 'u.id';
    const order = filters.order === 'desc' ? 'DESC' : 'ASC';
    const countParams = [...params];
    params.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
    const [result, countResult] = await Promise.all([pool.query(
        `
          SELECT
              u.id, u.role_id, u.class_id, u.name, u.email, u.is_active, u.created_at, u.updated_at,
              COUNT(*) OVER()::INTEGER AS total_count
          FROM users u
          ${where}
          ORDER BY ${sort} ${order}
          LIMIT $${params.length - 1} OFFSET $${params.length}
          `,
        params
    ), pool.query(`SELECT COUNT(*)::INTEGER AS total FROM users u ${where}`, countParams)]);
    return { items: result.rows.map(({ total_count, ...user }) => user), total: countResult.rows[0].total };
}

async function findRoleNameById(id) {
    const result = await pool.query('SELECT name FROM roles WHERE id = $1', [id]);
    return result.rows[0]?.name;
}

async function findUserById(id) {
    const result = await pool.query(
        `
          SELECT
              id,
              role_id,
              class_id,
              name,
              email,
              is_active,
              created_at,
              updated_at
          FROM users
          WHERE id = $1
          `,
        [id]
    );

    return result.rows[0];
}

async function findUserWithPasswordById(id) {
    const result = await pool.query(
        `
          SELECT
              id,
              password,
              class_id
          FROM users
          WHERE id = $1
          `,
        [id]
    );

    return result.rows[0];
}

async function insertUser(data) {
    const result = await pool.query(
        `
          INSERT INTO users (
              role_id,
              class_id,
              name,
              email,
              password
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
          `,
        [data.role_id, data.class_id || null, data.name, data.email, data.password]
    );

    return result.rows[0];
}

async function updateUserById(id, data) {
    const result = await pool.query(
        `
          UPDATE users
          SET
              role_id = COALESCE($1, role_id),
              class_id = $2,
              name = COALESCE($3, name),
              email = COALESCE($4, email),
              password = COALESCE($5, password),
              is_active = COALESCE($6, is_active),
              updated_at = NOW()
          WHERE id = $7
          RETURNING
              id,
              role_id,
              class_id,
              name,
              email,
              is_active,
              created_at,
              updated_at
          `,
        [
            data.role_id,
            data.class_id,
            data.name,
            data.email,
            data.password,
            data.is_active,
            id
        ]
    );

    return result.rows[0];
}

async function deleteUserById(id) {
    const result = await pool.query(
        `
          DELETE FROM users
          WHERE id = $1
          RETURNING
              id,
              role_id,
              class_id,
              name,
              email,
              is_active,
              created_at,
              updated_at
          `,
        [id]
    );

    return result.rows[0];
}

module.exports = {
    findAllUsers,
    findUserById,
    findUserWithPasswordById,
    insertUser,
    updateUserById,
    deleteUserById,
    findRoleNameById
};
