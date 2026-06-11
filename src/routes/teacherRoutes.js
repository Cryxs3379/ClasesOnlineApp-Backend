const express = require('express');
const { body } = require('express-validator');
const teacherController = require('../controllers/teacherController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

const profileValidation = [
  body('bio')
    .trim()
    .notEmpty()
    .withMessage('La biografía es obligatoria')
    .isLength({ max: 1000 })
    .withMessage('La biografía no puede superar los 1000 caracteres'),
  body('hourly_price')
    .notEmpty()
    .withMessage('El precio por hora es obligatorio')
    .isFloat({ min: 0 })
    .withMessage('El precio por hora debe ser un número positivo'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('La materia es obligatoria')
    .isLength({ max: 100 })
    .withMessage('La materia no puede superar los 100 caracteres'),
];

router.post(
  '/profile',
  authMiddleware,
  requireRole('teacher'),
  profileValidation,
  teacherController.createOrUpdateProfile
);

router.get('/', teacherController.getAllTeachers);
router.get('/:id', teacherController.getTeacherById);

module.exports = router;
