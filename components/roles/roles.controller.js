const rolesService = require('./roles.service');

function sendError(res, error) {
    if (error.code === '23505') {
        return res.status(409).json({ error: 'Role already exists' });
    }

    if (error.code === '23503') {
        return res.status(409).json({
            error: 'Role is used by users and cannot be deleted'
        });
    }

    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
    });
}

async function getRoles(req, res) {
    try {
        const roles = await rolesService.getRoles();
        res.json(roles);
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

async function getRoleById(req, res) {
    try {
        const { id } = req.params;
        const role = await rolesService.getRoleById(id);
        res.json(role);
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

async function createRole(req, res) {
    try {
        const role = await rolesService.createRole(req.body);
        res.status(201).json(role);
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

async function updateRole(req, res) {
    try {
        const { id } = req.params;
        const role = await rolesService.updateRole(id, req.body);
        res.json(role);
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

async function deleteRole(req, res) {
    try {
        const { id } = req.params;
        const role = await rolesService.deleteRole(id);

        res.json({
            message: 'Role deleted successfully',
            role
        });
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

module.exports = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};
