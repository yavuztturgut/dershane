const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const createHttpError = require('../../utils/create-http-error');
const crypto = require('crypto');
const emailService = require('./email.service');
const authStateCache = require('./auth-state-cache');

function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
        throw createHttpError('Password must contain at least 8 characters', 400, 'PASSWORD_TOO_SHORT');
    }
}

async function login(data) {
    const { email, password } = data;

    if (!email || !password) {
        throw createHttpError('Email and password are required', 400);
    }

    const user = await authRepository.findUserByEmail(email);

    if (!user) {
        throw createHttpError('Invalid email or password', 401);
    }

    if (!user.is_active) {
        throw createHttpError('User is inactive', 403);
    }

    if (!['admin', 'teacher', 'student'].includes(user.role_name)) {
        throw createHttpError('User role is not supported', 403, 'FORBIDDEN');
    }

    if (user.role_name === 'student' && !user.class_id) {
        throw createHttpError('Student class is required', 403, 'STUDENT_CLASS_REQUIRED');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw createHttpError('Invalid email or password', 401);
    }

    const token = jwt.sign(
        {
            id: user.id,
            role_id: user.role_id,
            role_name: user.role_name,
            class_id: user.class_id
            ,token_version: user.token_version
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    return {
        token,
        user: {
            id: user.id,
            role_id: user.role_id,
            role_name: user.role_name,
            class_id: user.class_id,
            class_name: user.class_name,
            name: user.name,
            email: user.email
        }
    };
}

async function getProfile(userId) {
    const profile = await authRepository.findProfileById(userId);

    if (!profile) {
        throw createHttpError('User not found', 404);
    }

    return profile;
}

async function updateProfile(userId, data) {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    if (!name || !/^\S+@\S+\.\S+$/.test(email || '')) {
        throw createHttpError('Valid name and email are required', 400, 'INVALID_PROFILE');
    }

    authStateCache.set(user.id, {
        id: user.id,
        role_id: user.role_id,
        role_name: user.role_name,
        class_id: user.class_id,
        is_active: user.is_active,
        token_version: user.token_version
    });
    await authRepository.updateProfile(userId, { name, email });
    return getProfile(userId);
}

async function changePassword(userId, data) {
    validatePassword(data.new_password);
    const user = await authRepository.findPasswordById(userId);
    if (!user || !data.current_password || !await bcrypt.compare(data.current_password, user.password)) {
        throw createHttpError('Current password is invalid', 400, 'INVALID_CURRENT_PASSWORD');
    }
    await authRepository.updatePassword(userId, await bcrypt.hash(data.new_password, 10));
    authStateCache.invalidate(userId);
}

function getResetBaseUrl() {
    if (process.env.RESET_URL_BASE) return process.env.RESET_URL_BASE;
    if (process.env.CLIENT_URL) return `${process.env.CLIENT_URL.replace(/\/$/, '')}/reset-password`;
    if (process.env.NODE_ENV === 'production') throw new Error('CLIENT_URL or RESET_URL_BASE is required in production');
    return 'http://localhost:5173/reset-password';
}

async function forgotPassword(data) {
    const email = data.email?.trim().toLowerCase();
    if (!email) return;
    const user = await authRepository.findUserByEmail(email);
    if (!user || !user.is_active) return;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await authRepository.createPasswordResetToken(user.id, tokenHash, new Date(Date.now() + 30 * 60 * 1000));
    const baseUrl = getResetBaseUrl();
    const language = data.language === 'tr' ? 'tr' : 'en';
    await emailService.sendPasswordReset({ email: user.email, name: user.name, resetUrl: `${baseUrl}?token=${token}`, language });
}

async function resetPassword(data) {
    validatePassword(data.new_password);
    if (!data.token) throw createHttpError('Reset token is required', 400, 'RESET_TOKEN_INVALID');
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');
    const resetToken = await authRepository.findValidPasswordResetToken(tokenHash);
    if (!resetToken) throw createHttpError('Reset token is invalid or expired', 400, 'RESET_TOKEN_INVALID');
    await authRepository.consumePasswordResetToken(resetToken.id, resetToken.user_id, await bcrypt.hash(data.new_password, 10));
    authStateCache.invalidate(resetToken.user_id);
}

module.exports = {
    login,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    getResetBaseUrl
};
