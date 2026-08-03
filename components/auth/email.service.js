const nodemailer = require('nodemailer');

let transporter;

const messages = {
    tr: {
        subject: 'Şifrenizi sıfırlayın',
        brand: 'Dershane Portalı',
        preview: 'Şifrenizi sıfırlamak için güvenli bağlantınızı kullanın.',
        greeting: (name) => `Merhaba ${name},`,
        introduction: 'Hesabınız için bir şifre sıfırlama talebi aldık.',
        action: 'Şifremi Sıfırla',
        expiry: 'Bu bağlantı 30 dakika boyunca geçerlidir.',
        fallbackLead: 'Buton çalışmıyorsa',
        fallbackAction: 'buraya tıklayın',
        ignore: 'Bu talebi siz yapmadıysanız bu e-postayı güvenle yok sayabilirsiniz.',
        textAction: 'Şifrenizi sıfırlamak için aşağıdaki bağlantıyı açın (30 dakika geçerlidir):',
    },
    en: {
        subject: 'Reset your password',
        brand: 'Academy Portal',
        preview: 'Use your secure link to reset your password.',
        greeting: (name) => `Hello ${name},`,
        introduction: 'We received a password reset request for your account.',
        action: 'Reset My Password',
        expiry: 'This link is valid for 30 minutes.',
        fallbackLead: 'If the button does not work,',
        fallbackAction: 'click here',
        ignore: 'If you did not make this request, you can safely ignore this email.',
        textAction: 'Open the link below to reset your password (valid for 30 minutes):',
    },
};

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function buildPasswordResetEmail({ name, resetUrl, language }) {
    const locale = language === 'tr' ? 'tr' : 'en';
    const copy = messages[locale];
    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(resetUrl);
    const html = `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08);">
        <tr><td style="padding:24px 32px;background:#2563eb;color:#ffffff;font-size:20px;font-weight:700;">${copy.brand}</td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:18px;font-weight:700;">${copy.greeting(safeName)}</p>
          <p style="margin:0 0 24px;line-height:1.6;color:#4b5563;">${copy.introduction}</p>
          <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:8px;background:#2563eb;">
            <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700;">${copy.action}</a>
          </td></tr></table>
          <p style="margin:20px 0 0;font-size:14px;color:#6b7280;">${copy.expiry}</p>
          <p style="margin:10px 0 0;font-size:14px;color:#6b7280;">${copy.fallbackLead} <a href="${safeUrl}" style="color:#2563eb;">${copy.fallbackAction}</a>.</p>
          <hr style="margin:28px 0;border:0;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#9ca3af;">${copy.ignore}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    const text = `${copy.greeting(name)}\n\n${copy.introduction}\n\n${copy.textAction}\n${resetUrl}\n\n${copy.ignore}`;

    return { subject: copy.subject, html, text };
}

function getTransporter() {
    if (!transporter) {
        if (!process.env.SMTP_HOST) throw new Error('SMTP is not configured');
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            } : undefined
        });
    }

    return transporter;
}

async function sendPasswordReset({ email, name, resetUrl, language }) {
    const content = buildPasswordResetEmail({ name, resetUrl, language });
    await getTransporter().sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        ...content,
    });
}

module.exports = { buildPasswordResetEmail, sendPasswordReset };
