const classesService = require('./classes.service');

async function getClasses(req, res) {
    const classes = await classesService.getClasses();
    res.json(classes);
}

async function getClassById(req, res) {
    const { id } = req.params;
    const classItem = await classesService.getClassById(id);
    res.json(classItem);
}

async function createClass(req, res) {
    const classItem = await classesService.createClass(req.body);
    res.status(201).json(classItem);
}

async function updateClass(req, res) {
    const { id } = req.params;
    const classItem = await classesService.updateClass(id, req.body);
    res.json(classItem);
}

async function deleteClass(req, res) {
    const { id } = req.params;
    const classItem = await classesService.deleteClass(id);

    res.json({
        message: 'Class deleted successfully',
        class: classItem
    });
}

module.exports = {
    getClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass
};
