const usersService = require('./users.service');

async function getUsers(req, res) {
    const users = await usersService.getUsers(req.query);
    res.json(users);
}

async function createUser(req, res) {
    const user = await usersService.createUser(req.body);
    res.status(201).json(user);
}

async function getUserById(req, res) {
    const { id } = req.params;
    const user = await usersService.getUserById(id);
    res.json(user);
}

async function updateUser(req, res) {
    const { id } = req.params;
    const user = await usersService.updateUser(id, req.body);
    res.json(user);
}

async function deleteUser(req, res) {
    const { id } = req.params;
    const user = await usersService.deleteUser(id);

    res.json({
        message: 'User deleted successfully',
        user
    });
}

module.exports = {
    getUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser
};
