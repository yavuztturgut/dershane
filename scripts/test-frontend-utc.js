const { spawnSync } = require('node:child_process');
const path = require('node:path');

const workspaceVitest = path.join(__dirname, '..', 'node_modules', 'vitest', 'vitest.mjs');
const vitest = require('node:fs').existsSync(workspaceVitest)
    ? workspaceVitest
    : path.join(__dirname, '..', 'frontend', 'node_modules', 'vitest', 'vitest.mjs');
const result = spawnSync(process.execPath, [vitest, 'run'], {
    cwd: path.join(__dirname, '..', 'frontend'),
    env: { ...process.env, TZ: 'UTC' },
    stdio: 'inherit'
});

process.exitCode = result.status ?? 1;
