const dashboardRepository = require('./dashboard.repository');

async function getSummary() {
    return dashboardRepository.getSummary();
}

module.exports = { getSummary };
