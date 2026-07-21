const rolesService = require('./roles.service');

async function getRoles(req, res) {
    const roles = await rolesService.getRoles();
    res.json(roles);
}

async function getRoleById(req, res) {
    const { id } = req.params;
    const role = await rolesService.getRoleById(id);
    res.json(role);
}

async function createRole(req, res) {
    const role = await rolesService.createRole(req.body);
    res.status(201).json(role);
}

async function updateRole(req, res) {
    const { id } = req.params;
    const role = await rolesService.updateRole(id, req.body);
    res.json(role);
}

async function deleteRole(req, res) {
    const { id } = req.params;
    const role = await rolesService.deleteRole(id);

    res.json({
        message: 'Role deleted successfully',
        role
    });
}

module.exports = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};
