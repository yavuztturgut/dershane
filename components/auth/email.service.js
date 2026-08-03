const nodemailer = require('nodemailer');

let transporter;

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

async function sendPasswordReset({ email, name, resetUrl }) {
    await getTransporter().sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Password reset',
        text: `Hello ${name},\n\nReset your password using this link (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this, ignore this email.`
    });
}

module.exports = { sendPasswordReset };
