const express = require('express');
const { body, param } = require('express-validator');
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

const uuidParam = param('id').isUUID().withMessage('El ID debe ser un UUID válido');

const createStudentValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 120 })
    .withMessage('El nombre debe tener entre 2 y 120 caracteres'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es obligatorio')
    .isEmail()
    .withMessage('El email no es válido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
];

const updateStatusValidation = [
  body('is_active')
    .notEmpty()
    .withMessage('is_active es obligatorio')
    .isBoolean()
    .withMessage('is_active debe ser un valor booleano'),
];

router.use(authMiddleware, requireRole('teacher'));

router.post('/', createStudentValidation, studentController.createStudent);
router.get('/', studentController.getStudents);
router.get('/:id', uuidParam, studentController.getStudentById);
router.patch(
  '/:id/status',
  uuidParam,
  updateStatusValidation,
  studentController.updateStudentStatus
);

module.exports = router;
