const AUTH_STATE_TTL_MS = 30 * 1000;
const MAX_AUTH_STATE_ENTRIES = 10_000;

const entries = new Map();
const pendingLoads = new Map();

function get(userId, now = Date.now()) {
    const key = Number(userId);
    const entry = entries.get(key);

    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
        entries.delete(key);
        return undefined;
    }

    return entry.value;
}

function removeExpired(now = Date.now()) {
    for (const [key, entry] of entries) {
        if (entry.expiresAt <= now) entries.delete(key);
    }
}

function set(userId, value, now = Date.now()) {
    const key = Number(userId);

    if (!entries.has(key) && entries.size >= MAX_AUTH_STATE_ENTRIES) {
        removeExpired(now);
        if (entries.size >= MAX_AUTH_STATE_ENTRIES) entries.delete(entries.keys().next().value);
    }

    entries.set(key, { value, expiresAt: now + AUTH_STATE_TTL_MS });
    return value;
}

function invalidate(userId) {
    const key = Number(userId);
    entries.delete(key);
    pendingLoads.delete(key);
}

function clear() {
    entries.clear();
    pendingLoads.clear();
}

async function getOrLoad(userId, loader) {
    const key = Number(userId);
    const cached = get(key);
    if (cached !== undefined) return cached;

    if (pendingLoads.has(key)) return pendingLoads.get(key);

    const pendingLoad = Promise.resolve(loader(key))
        .then((value) => {
            const normalizedValue = value ?? null;
            if (pendingLoads.get(key) === pendingLoad) set(key, normalizedValue);
            return normalizedValue;
        })
        .finally(() => {
            if (pendingLoads.get(key) === pendingLoad) pendingLoads.delete(key);
        });

    pendingLoads.set(key, pendingLoad);
    return pendingLoad;
}

function size() {
    return entries.size;
}

module.exports = {
    AUTH_STATE_TTL_MS,
    MAX_AUTH_STATE_ENTRIES,
    get,
    set,
    invalidate,
    clear,
    size,
    getOrLoad
};
