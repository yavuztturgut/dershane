const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPasswordResetEmail } = require('./email.service');

test('password reset email renders a Turkish branded button without a visible raw URL', () => {
    const resetUrl = 'https://example.com/reset-password?token=secret-token';
    const result = buildPasswordResetEmail({ name: 'Yavuz', resetUrl, language: 'tr' });

    assert.equal(result.subject, 'Şifrenizi sıfırlayın');
    assert.match(result.html, /Dershane Portalı/);
    assert.match(result.html, /Şifremi Sıfırla/);
    assert.match(result.html, /30 dakika/);
    assert.match(result.html, /buraya tıklayın/);
    assert.ok(!result.html.includes(`>${resetUrl}<`));
    assert.match(result.text, /https:\/\/example\.com\/reset-password\?token=secret-token/);
});

test('password reset email defaults to English and escapes dynamic HTML values', () => {
    const result = buildPasswordResetEmail({
        name: '<img src=x onerror=alert(1)>',
        resetUrl: 'https://example.com/reset?token=a&next="unsafe"',
        language: 'unsupported',
    });

    assert.equal(result.subject, 'Reset your password');
    assert.match(result.html, /Academy Portal/);
    assert.match(result.html, /Reset My Password/);
    assert.ok(!result.html.includes('<img src=x'));
    assert.match(result.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(result.html, /token=a&amp;next=&quot;unsafe&quot;/);
});
