const authService = require('./auth.service');

function sendError(res, error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
}

async function login(req, res) {
    try {
        const result = await authService.login(req.body);
        res.json(result);
    } catch (error) {
        sendError(res, error);
    }
}

async function getProfile(req, res) {
    try {
        const profile = await authService.getProfile(req.user.id);
        res.json(profile);
    } catch (error) {
        sendError(res, error);
    }
}

module.exports = {
    login,
    getProfile
};
