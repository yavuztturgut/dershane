const test = require('node:test');
const assert = require('node:assert/strict');
const { parseIstanbulDateBoundary } = require('./istanbul-date-time');

test('Istanbul date boundaries use an inclusive day start and exclusive next day', () => {
    assert.equal(parseIstanbulDateBoundary('2026-08-15').toISOString(), '2026-08-14T21:00:00.000Z');
    assert.equal(parseIstanbulDateBoundary('2026-08-15', true).toISOString(), '2026-08-15T21:00:00.000Z');
});

test('Istanbul date boundaries reject impossible calendar dates', () => {
    assert.equal(parseIstanbulDateBoundary('2026-02-30'), null);
    assert.equal(parseIstanbulDateBoundary('15.08.2026'), null);
});
