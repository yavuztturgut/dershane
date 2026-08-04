const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('./lookups.repository');
const service = require('./lookups.service');

test('lookups are returned through one repository operation', async () => {
    const expected = { roles: [], classes: [], courses: [], teachers: [] };
    let calls = 0;
    repository.findLookups = async () => { calls += 1; return expected; };

    assert.equal(await service.getLookups(), expected);
    assert.equal(calls, 1);
});
