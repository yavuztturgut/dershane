const test = require('node:test');
const assert = require('node:assert/strict');
const authStateCache = require('../components/auth/auth-state-cache');

test.beforeEach(() => authStateCache.clear());

test('auth state cache reuses a loaded user inside its TTL', async () => {
    let loadCount = 0;
    const loader = async () => ({ id: 7, role_name: 'admin', load: ++loadCount });

    const first = await authStateCache.getOrLoad(7, loader);
    const second = await authStateCache.getOrLoad(7, loader);

    assert.equal(loadCount, 1);
    assert.equal(first, second);
});

test('concurrent auth requests share one database load', async () => {
    let loadCount = 0;
    const loader = async () => {
        loadCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { id: 7 };
    };

    const results = await Promise.all([
        authStateCache.getOrLoad(7, loader),
        authStateCache.getOrLoad(7, loader),
        authStateCache.getOrLoad(7, loader)
    ]);

    assert.equal(loadCount, 1);
    assert.deepEqual(results, [{ id: 7 }, { id: 7 }, { id: 7 }]);
});

test('auth state cache expires and supports explicit invalidation', async () => {
    authStateCache.set(7, { id: 7 }, 1_000);
    assert.equal(authStateCache.get(7, 1_000 + authStateCache.AUTH_STATE_TTL_MS - 1).id, 7);
    assert.equal(authStateCache.get(7, 1_000 + authStateCache.AUTH_STATE_TTL_MS), undefined);

    authStateCache.set(7, { id: 7 });
    authStateCache.invalidate(7);
    assert.equal(authStateCache.get(7), undefined);
});

test('auth state cache stays within its configured entry limit', () => {
    for (let id = 1; id <= authStateCache.MAX_AUTH_STATE_ENTRIES + 1; id += 1) {
        authStateCache.set(id, { id });
    }

    assert.equal(authStateCache.size(), authStateCache.MAX_AUTH_STATE_ENTRIES);
    assert.equal(authStateCache.get(1), undefined);
});
