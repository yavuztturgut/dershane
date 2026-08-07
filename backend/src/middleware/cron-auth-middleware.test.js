const test = require('node:test');
const assert = require('node:assert/strict');
const cronAuthMiddleware = require('./cron-auth-middleware');

function createResponse() {
    return {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test('cron authentication fails closed when the secret is not configured', (t) => {
    const previousSecret = process.env.CRON_SECRET;
    t.after(() => {
        if (previousSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = previousSecret;
    });
    delete process.env.CRON_SECRET;

    const response = createResponse();
    let nextCalls = 0;
    cronAuthMiddleware({ get: () => undefined }, response, () => { nextCalls += 1; });

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.errorCode, 'CRON_NOT_CONFIGURED');
    assert.equal(nextCalls, 0);
});

test('cron authentication rejects missing and incorrect bearer tokens', (t) => {
    const previousSecret = process.env.CRON_SECRET;
    t.after(() => {
        if (previousSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = previousSecret;
    });
    process.env.CRON_SECRET = 'a-secure-test-secret';

    for (const authorization of [undefined, 'Bearer incorrect']) {
        const response = createResponse();
        let nextCalls = 0;
        cronAuthMiddleware({ get: () => authorization }, response, () => { nextCalls += 1; });
        assert.equal(response.statusCode, 401);
        assert.equal(response.body.errorCode, 'UNAUTHORIZED');
        assert.equal(nextCalls, 0);
    }
});

test('cron authentication accepts the configured bearer token', (t) => {
    const previousSecret = process.env.CRON_SECRET;
    t.after(() => {
        if (previousSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = previousSecret;
    });
    process.env.CRON_SECRET = 'a-secure-test-secret';

    const response = createResponse();
    let nextCalls = 0;
    cronAuthMiddleware({ get: () => 'Bearer a-secure-test-secret' }, response, () => { nextCalls += 1; });

    assert.equal(response.statusCode, 200);
    assert.equal(nextCalls, 1);
});
