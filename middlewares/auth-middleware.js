const jwt = require('jsonwebtoken');
const authRepository = require('../components/auth/auth.repository');
const authStateCache = require('../components/auth/auth-state-cache');

const authMiddleware = async (req, res, next) => {
    const token = req.cookies.access_token;

    if (!token) {
        return res.status(401).json({ error: 'Token is required', errorCode: 'TOKEN_REQUIRED' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await authStateCache.getOrLoad(payload.id, authRepository.findAuthStateById);
        if (!user || !user.is_active || !['admin', 'teacher', 'student'].includes(user.role_name) || user.token_version !== payload.token_version) {
            return res.status(401).json({ error: 'Invalid token', errorCode: 'INVALID_TOKEN' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token', errorCode: 'INVALID_TOKEN' });
    }
};

module.exports = authMiddleware;
