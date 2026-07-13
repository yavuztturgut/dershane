const express = require('express');
const router = express.Router();

const classesController = require('../controllers/classes-controller');
const authMiddleware = require('../middlewares/auth-middleware');

router.get('/', authMiddleware, classesController.getClasses);
router.get('/:id', authMiddleware, classesController.getClassById);

module.exports = router;