const usersService = require('./users.service');

function sendError(res, error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
}

async function getUsers(req, res) {
    try {
        const users = await usersService.getUsers();
        res.json(users);
    } catch (error) {
        sendError(res, error);
    }
}

async function createUser(req, res) {
    try {
        const user = await usersService.createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        sendError(res, error);
    }
}

async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const user = await usersService.getUserById(id);
        res.json(user);
    } catch (error) {
        sendError(res, error);
    }
}

async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const user = await usersService.updateUser(id, req.body);
        res.json(user);
    } catch (error) {
        sendError(res, error);
    }
}

async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const user = await usersService.deleteUser(id);

        res.json({
            message: 'User deleted successfully',
            user
        });
    } catch (error) {
        sendError(res, error);
    }
}

module.exports = {
    getUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser
};
