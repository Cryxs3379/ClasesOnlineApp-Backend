const express = require('express');
const { body } = require('express-validator');
const classController = require('../controllers/classController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

const createClassValidation = [
  body('teacher_id')
    .notEmpty()
    .withMessage('El ID del profesor es obligatorio')
    .isInt({ min: 1 })
    .withMessage('El ID del profesor debe ser un número entero válido'),
  body('start_time')
    .notEmpty()
    .withMessage('La hora de inicio es obligatoria')
    .isISO8601()
    .withMessage('La hora de inicio debe tener formato ISO 8601'),
  body('end_time')
    .notEmpty()
    .withMessage('La hora de fin es obligatoria')
    .isISO8601()
    .withMessage('La hora de fin debe tener formato ISO 8601'),
];

router.use(authMiddleware);

router.post(
  '/',
  requireRole('student'),
  createClassValidation,
  classController.createClass
);

router.get('/my-classes', classController.getMyClasses);
router.get('/:id', classController.getClassById);

module.exports = router;
