const coursesRepository = require('./courses.repository');

async function getCourses() {
    return coursesRepository.findAllCourses();
}

async function getCourseById(id) {
    const course = await coursesRepository.findCourseById(id);

    if (!course) {
        const error = new Error('Course not found');
        error.statusCode = 404;
        throw error;
    }

    return course;
}

async function createCourse(data) {
    const { name } = data;

    if (!name) {
        const error = new Error('Course name is required');
        error.statusCode = 400;
        throw error;
    }

    return coursesRepository.insertCourse(name);
}

async function updateCourse(id, data) {
    const { name } = data;

    if (!name) {
        const error = new Error('Course name is required');
        error.statusCode = 400;
        throw error;
    }

    const course = await coursesRepository.updateCourseById(id, name);

    if (!course) {
        const error = new Error('Course not found');
        error.statusCode = 404;
        throw error;
    }

    return course;
}

async function deleteCourse(id) {
    const course = await coursesRepository.deleteCourseById(id);

    if (!course) {
        const error = new Error('Course not found');
        error.statusCode = 404;
        throw error;
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
