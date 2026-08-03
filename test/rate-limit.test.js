const test = require('node:test');
const assert = require('node:assert/strict');
const createRateLimit = require('../utils/rate-limit');

test('rate limiter rejects requests over the configured limit', () => {
    const middleware = createRateLimit({ windowMs: 60_000, limit: 1 });
    const req = { ip: '127.0.0.1' };
    let nextCalls = 0;
    const response = { statusCode: 200, headers: {}, set(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    middleware(req, response, () => { nextCalls += 1; });
    middleware(req, response, () => { nextCalls += 1; });
    assert.equal(nextCalls, 1);
    assert.equal(response.statusCode, 429);
    assert.equal(response.body.errorCode, 'TOO_MANY_REQUESTS');
});
