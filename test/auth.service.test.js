const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('../components/auth/auth.repository');
const service = require('../components/auth/auth.service');

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
