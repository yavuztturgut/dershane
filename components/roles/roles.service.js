const rolesRepository = require('./roles.repository');
const createHttpError = require('../../utils/create-http-error');

async function getRoles() {
    return rolesRepository.findAllRoles();
}

async function getRoleById(id) {
    const role = await rolesRepository.findRoleById(id);

    if (!role) {
        throw createHttpError('Role not found', 404);
    }

    return role;
}

async function createRole(data) {
    const { name } = data;

    if (!name) {
        throw createHttpError('Role name is required', 400);
    }

    return rolesRepository.insertRole(name);
}

async function updateRole(id, data) {
    const { name } = data;

    if (!name) {
        throw createHttpError('Role name is required', 400);
    }

    const role = await rolesRepository.updateRoleById(id, name);

    if (!role) {
        throw createHttpError('Role not found', 404);
    }

    return role;
}

async function deleteRole(id) {
    const role = await rolesRepository.deleteRoleById(id);

    if (!role) {
        throw createHttpError('Role not found', 404);
    }

    return role;
}

module.exports = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};
