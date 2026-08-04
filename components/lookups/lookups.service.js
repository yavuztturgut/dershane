const lookupsRepository = require('./lookups.repository');

async function getLookups() {
    return lookupsRepository.findLookups();
}

module.exports = { getLookups };
