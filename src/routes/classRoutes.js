const express = require('express');
const { body, param } = require('express-validator');
const classController = require('../controllers/classController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

const uuidParam = param('id').isUUID().withMessage('El ID debe ser un UUID válido');

const createClassValidation = [
  body('student_id')
    .notEmpty()
    .withMessage('El ID del alumno es obligatorio')
    .isUUID()
    .withMessage('El ID del alumno debe ser un UUID válido'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El título es obligatorio')
    .isLength({ max: 180 })
    .withMessage('El título no puede superar los 180 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede superar los 2000 caracteres'),
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

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('El estado es obligatorio')
    .isIn(['scheduled', 'completed', 'cancelled', 'missed'])
    .withMessage('El estado debe ser scheduled, completed, cancelled o missed'),
];

router.use(authMiddleware);

router.post(
  '/',
  requireRole('teacher'),
  createClassValidation,
  classController.createClass
);

router.get(
  '/my-classes',
  requireRole('teacher', 'student', 'admin'),
  classController.getMyClasses
);

router.patch(
  '/:id/status',
  uuidParam,
  requireRole('teacher'),
  updateStatusValidation,
  classController.updateClassStatus
);

router.get('/:id', uuidParam, classController.getClassById);

module.exports = router;
