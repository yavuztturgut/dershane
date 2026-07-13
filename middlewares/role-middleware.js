function requireRole(...roles) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({error: 'Unauthorized'});
        }

        if (!roles.includes(req.user.role_name)) {
            return res.status(403).json({error: 'Forbidden'});
        }

        next();
    }
}
module.exports = requireRole;