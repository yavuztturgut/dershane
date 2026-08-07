const usersService = require('./users.service');

async function getUsers(req, res) {
    const users = await usersService.getUsers(req.query);
    res.json(users);
}

async function getUserOptions(req, res) {
    res.json(await usersService.getUserOptions(req.query));
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
        message: user.is_active === false ? 'Student deactivated successfully' : 'User deleted successfully',
        action: user.is_active === false ? 'deactivated' : 'deleted',
        user
    });
}

module.exports = {
    getUsers,
    getUserOptions,
    createUser,
    getUserById,
    updateUser,
    deleteUser
};
