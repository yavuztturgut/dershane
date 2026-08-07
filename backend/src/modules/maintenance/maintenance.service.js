const maintenanceRepository = require('./maintenance.repository');

async function keepDatabaseAlive() {
    return maintenanceRepository.pingDatabase();
}

module.exports = { keepDatabaseAlive };
