const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('./auth.repository');
const service = require('./auth.service');
const emailService = require('./email.service');

test('login fails closed for unsupported roles', async () => {
    repository.findUserByEmail = async () => ({ id: 1, role_name: 'custom', status: 1, password: 'unused' });
    await assert.rejects(
        service.login({ email: 'custom@example.com', password: 'password' }),
        (error) => error.statusCode === 403 && error.errorCode === 'FORBIDDEN'
    );
});

test('inactive and deleted users cannot log in', async () => {
    for (const status of [0, -1]) {
        repository.findUserByEmail = async () => ({ id: 1, role_name: 'admin', status, password: 'unused' });
        await assert.rejects(
            service.login({ email: 'user@example.com', password: '12345678' }),
            (error) => error.statusCode === 403 && error.message === 'User is inactive'
        );
    }
});

test('invalid reset tokens return a stable error code', async () => {
    repository.findValidPasswordResetToken = async () => undefined;
    await assert.rejects(
        service.resetPassword({ token: 'invalid', new_password: '12345678' }),
        (error) => error.errorCode === 'RESET_TOKEN_INVALID'
    );
});

test('forgot password passes the selected language to the email service', async () => {
    repository.findUserByEmail = async () => ({ id: 1, name: 'Yavuz', email: 'yavuz@example.com', status: 1 });
    repository.createPasswordResetToken = async () => undefined;
    let sentEmail;
    emailService.sendPasswordReset = async (message) => { sentEmail = message; };

    await service.forgotPassword({ email: 'yavuz@example.com', language: 'tr' });

    assert.equal(sentEmail.language, 'tr');
    assert.match(sentEmail.resetUrl, /^http:\/\/localhost:5173\/reset-password\?token=/);
});

test('production password reset URLs require explicit client configuration', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousClientUrl = process.env.CLIENT_URL;
    const previousResetUrl = process.env.RESET_URL_BASE;
    process.env.NODE_ENV = 'production';
    delete process.env.CLIENT_URL;
    delete process.env.RESET_URL_BASE;

    try {
        assert.throws(() => service.getResetBaseUrl(), /CLIENT_URL or RESET_URL_BASE/);
        process.env.CLIENT_URL = 'https://portal.example.com/';
        assert.equal(service.getResetBaseUrl(), 'https://portal.example.com/reset-password');
    } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
        if (previousClientUrl === undefined) delete process.env.CLIENT_URL; else process.env.CLIENT_URL = previousClientUrl;
        if (previousResetUrl === undefined) delete process.env.RESET_URL_BASE; else process.env.RESET_URL_BASE = previousResetUrl;
    }
});

test('profile updates normalize input and return the refreshed profile', async (t) => {
    const originalUpdateProfile = repository.updateProfile;
    const originalFindProfileById = repository.findProfileById;
    t.after(() => {
        repository.updateProfile = originalUpdateProfile;
        repository.findProfileById = originalFindProfileById;
    });

    let update;
    repository.updateProfile = async (id, data) => { update = { id, data }; };
    repository.findProfileById = async (id) => ({ id, name: 'Yavuz Admin 2', email: 'yavuz@example.com' });

    const result = await service.updateProfile(7, {
        name: '  Yavuz Admin 2  ',
        email: 'YAVUZ@EXAMPLE.COM',
    });

    assert.deepEqual(update, {
        id: 7,
        data: { name: 'Yavuz Admin 2', email: 'yavuz@example.com' },
    });
    assert.deepEqual(result, { id: 7, name: 'Yavuz Admin 2', email: 'yavuz@example.com' });
});
