const coursesRepository = require('./courses.repository');
const createHttpError = require('../../shared/errors/create-http-error');

async function getCourses() {
    return coursesRepository.findAllCourses();
}

async function getCourseById(id) {
    const course = await coursesRepository.findCourseById(id);

    if (!course) {
        throw createHttpError('Course not found', 404);
    }

    return course;
}

async function createCourse(data) {
    const name = data.name?.trim();

    if (!name) {
        throw createHttpError('Course name is required', 400);
    }

    return coursesRepository.insertCourse(name);
}

async function updateCourse(id, data) {
    const name = data.name?.trim();

    if (!name) {
        throw createHttpError('Course name is required', 400);
    }

    const course = await coursesRepository.updateCourseById(id, name);

    if (!course) {
        throw createHttpError('Course not found', 404);
    }

    return course;
}

async function deleteCourse(id) {
    const course = await coursesRepository.deleteCourseById(id);

    if (!course) {
        throw createHttpError('Course not found', 404);
    }

    return course;
}

module.exports = {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse
};
