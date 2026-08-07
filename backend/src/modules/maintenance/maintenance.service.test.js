const test = require('node:test');
const assert = require('node:assert/strict');
const maintenanceRepository = require('./maintenance.repository');
const maintenanceService = require('./maintenance.service');

test('database keep-alive performs exactly one database ping', async (t) => {
    const originalPingDatabase = maintenanceRepository.pingDatabase;
    t.after(() => { maintenanceRepository.pingDatabase = originalPingDatabase; });
    let pingCalls = 0;
    maintenanceRepository.pingDatabase = async () => {
        pingCalls += 1;
        return true;
    };

    assert.equal(await maintenanceService.keepDatabaseAlive(), true);
    assert.equal(pingCalls, 1);
});
