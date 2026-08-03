const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('../components/auth/auth.repository');
const service = require('../components/auth/auth.service');
const emailService = require('../components/auth/email.service');

test('login fails closed for unsupported roles', async () => {
    repository.findUserByEmail = async () => ({ id: 1, role_name: 'custom', is_active: true, password: 'unused' });
    await assert.rejects(
        service.login({ email: 'custom@example.com', password: 'password' }),
        (error) => error.statusCode === 403 && error.errorCode === 'FORBIDDEN'
    );
});

test('invalid reset tokens return a stable error code', async () => {
    repository.findValidPasswordResetToken = async () => undefined;
    await assert.rejects(
        service.resetPassword({ token: 'invalid', new_password: '12345678' }),
        (error) => error.errorCode === 'RESET_TOKEN_INVALID'
    );
});

test('forgot password passes the selected language to the email service', async () => {
    repository.findUserByEmail = async () => ({ id: 1, name: 'Yavuz', email: 'yavuz@example.com', is_active: true });
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
