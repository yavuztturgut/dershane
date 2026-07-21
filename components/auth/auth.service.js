const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const createHttpError = require('../../utils/create-http-error');

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

module.exports = {
    login,
    getProfile
};
