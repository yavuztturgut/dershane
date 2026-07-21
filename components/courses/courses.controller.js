const coursesService = require('./courses.service');

async function getCourses(req, res) {
    const courses = await coursesService.getCourses();
    res.json(courses);
}

async function getCourseById(req, res) {
    const { id } = req.params;
    const course = await coursesService.getCourseById(id);
    res.json(course);
}

async function createCourse(req, res) {
    const course = await coursesService.createCourse(req.body);
    res.status(201).json(course);
}

async function updateCourse(req, res) {
    const { id } = req.params;
    const course = await coursesService.updateCourse(id, req.body);
    res.json(course);
}

async function deleteCourse(req, res) {
    const { id } = req.params;
    const course = await coursesService.deleteCourse(id);

    res.json({
        message: 'Course deleted successfully',
        course
    });
}

module.exports = {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse
};
