const pool = require('../../infrastructure/database/pool');

async function getSummary() {
    const result = await pool.query(`
        SELECT
            (SELECT COUNT(*)::INTEGER FROM users) AS users,
            (SELECT COUNT(*)::INTEGER FROM courses) AS courses,
            (SELECT COUNT(*)::INTEGER FROM classes) AS classes,
            (SELECT COUNT(*)::INTEGER FROM schedules) AS schedules
    `);
    return result.rows[0];
}

module.exports = { getSummary };
