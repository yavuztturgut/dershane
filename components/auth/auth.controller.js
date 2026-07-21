const authService = require('./auth.service');

async function login(req, res) {
    const result = await authService.login(req.body);
    res.json(result);
}

async function getProfile(req, res) {
    const profile = await authService.getProfile(req.user.id);
    res.json(profile);
}

module.exports = {
    login,
    getProfile
};
