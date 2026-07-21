const classesRepository = require('./classes.repository');
const createHttpError = require('../../utils/create-http-error');

async function getClasses() {
    return classesRepository.findAllClasses();
}

async function getClassById(id) {
    const classItem = await classesRepository.findClassById(id);

    if (!classItem) {
        throw createHttpError('Class not found', 404);
    }

    return classItem;
}

async function createClass(data) {
    const { name } = data;

    if (!name) {
        throw createHttpError('Class name is required', 400);
    }

    return classesRepository.insertClass(name);
}

async function updateClass(id, data) {
    const { name } = data;

    if (!name) {
        throw createHttpError('Class name is required', 400);
    }

    const classItem = await classesRepository.updateClassById(id, name);

    if (!classItem) {
        throw createHttpError('Class not found', 404);
    }

    return classItem;
}

async function deleteClass(id) {
    const classItem = await classesRepository.deleteClassById(id);

    if (!classItem) {
        throw createHttpError('Class not found', 404);
    }

    return classItem;
}

module.exports = {
    getClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass
};
