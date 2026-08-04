const lookupsService = require('./lookups.service');

async function getLookups(req, res) {
    res.json(await lookupsService.getLookups());
}

module.exports = { getLookups };
