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

async function updateProfile(req, res) {
    res.json(await authService.updateProfile(req.user.id, req.body));
}

async function changePassword(req, res) {
    await authService.changePassword(req.user.id, req.body);
    res.clearCookie('access_token', getCookieOptions());
    res.status(204).send();
}

async function forgotPassword(req, res) {
    try {
        await authService.forgotPassword(req.body);
    } catch (error) {
        console.error('Password reset email failed:', error);
    }
    res.status(202).json({ message: 'If the account exists, a reset email has been sent' });
}

async function resetPassword(req, res) {
    await authService.resetPassword(req.body);
    res.clearCookie('access_token', getCookieOptions());
    res.status(204).send();
}

function logout(req, res) {
    res.clearCookie('access_token', getCookieOptions());
    res.status(204).send();
}

module.exports = {
    login,
    getProfile,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
};
