const maintenanceService = require('./maintenance.service');

async function keepDatabaseAlive(req, res) {
    await maintenanceService.keepDatabaseAlive();
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ ok: true });
}

module.exports = { keepDatabaseAlive };
