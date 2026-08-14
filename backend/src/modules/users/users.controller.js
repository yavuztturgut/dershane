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
    const user = await usersService.updateUser(id, req.body, req.user.id);
    res.json(user);
}

async function deleteUser(req, res) {
    const { id } = req.params;
    const user = await usersService.deleteUser(id, req.user.id);

    res.json({
        message: 'User deleted successfully',
        action: 'deleted',
        user
    });
}

async function restoreUser(req, res) {
    const user = await usersService.restoreUser(req.params.id);
    res.json({ message: 'User restored successfully', action: 'restored', user });
}

async function previewBulkUsers(req, res) {
    res.json(await usersService.previewBulkUsers(req.body, req.user.id));
}

async function applyBulkUsers(req, res) {
    res.json(await usersService.applyBulkUsers(req.body, req.user.id));
}

module.exports = {
    getUsers,
    getUserOptions,
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    restoreUser,
    previewBulkUsers,
    applyBulkUsers
};
