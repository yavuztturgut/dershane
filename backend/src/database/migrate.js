const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
const productionConfirmed = process.argv.includes('--confirm-production');
const statusOnly = process.argv.includes('--status');

if (migrationUrl && !productionConfirmed && !statusOnly) {
    throw new Error('Production migrations require --confirm-production');
}
if (migrationUrl) process.env.DATABASE_URL = migrationUrl;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const pool = require('./pool');

function safeTarget(connectionString) {
    const target = new URL(connectionString);
    return `${target.hostname}:${target.port || '5432'}${target.pathname}`;
}

async function migrate() {
    console.log(`Migration target: ${safeTarget(process.env.DATABASE_URL)}`);
    const directory = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(directory).filter((file) => file.endsWith('.sql')).sort();

    if (statusOnly) {
        const historyTable = await pool.query("SELECT to_regclass('schema_migrations') AS name");
        const applied = historyTable.rows[0].name
            ? await pool.query('SELECT name FROM schema_migrations')
            : { rows: [] };
        const appliedNames = new Set(applied.rows.map((row) => row.name));
        for (const file of files) console.log(`${appliedNames.has(file) ? 'applied' : 'pending'} ${file}`);
        return;
    }

    const lockClient = await pool.connect();
    let locked = false;

    try {
        await lockClient.query('SELECT pg_advisory_lock($1)', [731942608]);
        locked = true;
        await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            name VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`);
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
    } finally {
        if (locked) await lockClient.query('SELECT pg_advisory_unlock($1)', [731942608]);
        lockClient.release();
    }
}

migrate().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => pool.end());
