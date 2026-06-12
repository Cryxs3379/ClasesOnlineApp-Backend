const express = require('express');
const { body, param } = require('express-validator');
const teacherController = require('../controllers/teacherController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

const uuidParam = param('id').isUUID().withMessage('El ID debe ser un UUID válido');

const profileValidation = [
  body('bio')
    .trim()
    .notEmpty()
    .withMessage('La biografía es obligatoria')
    .isLength({ max: 2000 })
    .withMessage('La biografía no puede superar los 2000 caracteres'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio por hora debe ser un número positivo'),
  body('hourly_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio por hora debe ser un número positivo'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('La materia es obligatoria')
    .isLength({ max: 150 })
    .withMessage('La materia no puede superar los 150 caracteres'),
  body('avatar_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('avatar_url debe ser una URL válida'),
  body().custom((value) => {
    if (value.hourly_rate === undefined && value.hourly_price === undefined) {
      throw new Error('El precio por hora (hourly_rate) es obligatorio');
    }
    return true;
  }),
];

router.post(
  '/profile',
  authMiddleware,
  requireRole('teacher'),
  profileValidation,
  teacherController.createOrUpdateProfile
);

router.get('/', teacherController.getAllTeachers);
router.get('/:id', uuidParam, teacherController.getTeacherById);

module.exports = router;
