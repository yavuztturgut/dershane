const crypto = require('crypto');

function digest(value) {
    return crypto.createHash('sha256').update(value).digest();
}

function cronAuthMiddleware(req, res, next) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return res.status(503).json({ error: 'Cron authentication is not configured', errorCode: 'CRON_NOT_CONFIGURED' });
    }

    const authorization = req.get('authorization') || '';
    const expected = `Bearer ${secret}`;
    if (!crypto.timingSafeEqual(digest(authorization), digest(expected))) {
        return res.status(401).json({ error: 'Unauthorized', errorCode: 'UNAUTHORIZED' });
    }

    next();
}

module.exports = cronAuthMiddleware;
