const coursesService = require('./courses.service');

async function getCourses(req, res) {
    try {
        const courses = await coursesService.getCourses();
        res.json(courses);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
    }
}

async function getCourseById(req, res) {
    try {
        const { id } = req.params;
        const course = await coursesService.getCourseById(id);
        res.json(course);
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
    }
}

async function createCourse(req, res) {
    try {
        const course = await coursesService.createCourse(req.body);
        res.status(201).json(course);
    } catch (error) {
        console.error(error);

        if (error.code === '23505') {
            return res.status(409).json({ error: 'Course name already exists' });
        }

        res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
    }
}

async function updateCourse(req, res) {
    try {
        const { id } = req.params;
        const course = await coursesService.updateCourse(id, req.body);
        res.json(course);
    } catch (error) {
        console.error(error);

        if (error.code === '23505') {
            return res.status(409).json({ error: 'Course name already exists' });
        }

        res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
    }
}

async function deleteCourse(req, res) {
    try {
        const { id } = req.params;
        const course = await coursesService.deleteCourse(id);

        res.json({
            message: 'Course deleted successfully',
            course
        });
    } catch (error) {
        console.error(error);

        if (error.code === '23503') {
            return res.status(409).json({
                error: 'Course is used in schedules and cannot be deleted'
            });
        }

        res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
    }
}

module.exports = {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse
};
