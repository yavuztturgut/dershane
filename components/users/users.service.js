const bcrypt = require('bcrypt');
const usersRepository = require('./users.repository');
const createHttpError = require('../../utils/create-http-error');

async function getUsers() {
    return usersRepository.findAllUsers();
}

async function getUserById(id) {
    const user = await usersRepository.findUserById(id);

    if (!user) {
        throw createHttpError('User not found', 404);
    }

    return user;
}

async function createUser(data) {
    const { role_id, class_id, name, email, password } = data;

    if (!role_id || !name || !email || !password) {
        throw createHttpError('Missing required fields', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return usersRepository.insertUser({
        role_id,
        class_id,
        name,
        email,
        password: hashedPassword
    });
}

async function updateUser(id, data) {
    const existingUser = await usersRepository.findUserWithPasswordById(id);

    if (!existingUser) {
        throw createHttpError('User not found', 404);
    }

    let hashedPassword = existingUser.password;

    if (data.password) {
        hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const classId = data.class_id === undefined ? existingUser.class_id : data.class_id;

    return usersRepository.updateUserById(id, {
        role_id: data.role_id,
        class_id: classId,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        is_active: data.is_active
    });
}

async function deleteUser(id) {
    const user = await usersRepository.deleteUserById(id);

    if (!user) {
        throw createHttpError('User not found', 404);
    }

    return user;
}

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
