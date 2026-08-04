const dashboardService = require('./dashboard.service');

async function getSummary(req, res) {
    res.json(await dashboardService.getSummary());
}

module.exports = { getSummary };
