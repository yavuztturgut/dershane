const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
const pool = require('./pool');

async function migrate() {
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    const directory = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(directory).filter((file) => file.endsWith('.sql')).sort();

    for (const file of files) {
        const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
        if (applied.rowCount) continue;
        const sql = fs.readFileSync(path.join(directory, file), 'utf8')
            .replace(/^\s*BEGIN;\s*$/gmi, '')
            .replace(/^\s*COMMIT;\s*$/gmi, '');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log(`Applied ${file}`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

migrate().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => pool.end());
