const classesService = require('./classes.service');

function sendError(res, error) {
    if (error.code === '23505') {
        return res.status(409).json({ error: 'Class already exists' });
    }

    if (error.code === '23503') {
        return res.status(409).json({
            error: 'Class is used by users or schedules and cannot be deleted'
        });
    }

    return res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
    });
}

async function getClasses(req, res) {
    try {
        const classes = await classesService.getClasses();
        res.json(classes);
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

async function getClassById(req, res) {
    try {
        const { id } = req.params;
        const classItem = await classesService.getClassById(id);
        res.json(classItem);
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

async function createClass(req, res) {
    try {
        const classItem = await classesService.createClass(req.body);
        res.status(201).json(classItem);
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

async function updateClass(req, res) {
    try {
        const { id } = req.params;
        const classItem = await classesService.updateClass(id, req.body);
        res.json(classItem);
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

async function deleteClass(req, res) {
    try {
        const { id } = req.params;
        const classItem = await classesService.deleteClass(id);

        res.json({
            message: 'Class deleted successfully',
            class: classItem
        });
    } catch (error) {
        console.log(error);
        sendError(res, error);
    }
}

module.exports = {
    getClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass
};
