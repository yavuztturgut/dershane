const authService = require('./auth.service');

function getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    const secure = process.env.COOKIE_SECURE === 'true' || isProduction;

    return {
        httpOnly: true,
        secure,
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        path: '/'
    };
}

async function login(req, res) {
    const result = await authService.login(req.body);

    res.cookie('access_token', result.token, {
        ...getCookieOptions(),
        maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ user: result.user });
}

async function getProfile(req, res) {
    const profile = await authService.getProfile(req.user.id);
    res.json(profile);
}

function logout(req, res) {
    res.clearCookie('access_token', getCookieOptions());
    res.status(204).send();
}

module.exports = {
    login,
    getProfile,
    logout
};
