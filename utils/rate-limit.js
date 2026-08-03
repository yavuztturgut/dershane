function createRateLimit({ windowMs, limit, key = (req) => req.ip }) {
    const buckets = new Map();

    return function rateLimit(req, res, next) {
        const now = Date.now();
        if (buckets.size > 10000) {
            for (const [storedKey, bucket] of buckets) {
                if (bucket.resetAt <= now) buckets.delete(storedKey);
            }
        }
        const bucketKey = key(req);
        const current = buckets.get(bucketKey);

        if (!current || current.resetAt <= now) {
            buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (current.count >= limit) {
            res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
            return res.status(429).json({ error: 'Too many requests', errorCode: 'TOO_MANY_REQUESTS' });
        }

        current.count += 1;
        next();
    };
}

module.exports = createRateLimit;
