const rolesRepository = require('./roles.repository');
const createHttpError = require('../../shared/errors/create-http-error');

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
    throw createHttpError('System roles are fixed', 405, 'SYSTEM_ROLES_FIXED');
}

async function updateRole(id, data) {
    throw createHttpError('System roles are fixed', 405, 'SYSTEM_ROLES_FIXED');
}

async function deleteRole(id) {
    throw createHttpError('System roles are fixed', 405, 'SYSTEM_ROLES_FIXED');
}

module.exports = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
};
