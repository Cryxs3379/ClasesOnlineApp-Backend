const express = require('express');
const { body, param } = require('express-validator');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const { handleUpload } = require('../middlewares/uploadMiddleware');

const router = express.Router();

const uuidParam = param('id').isUUID().withMessage('El ID debe ser un UUID válido');
const classIdParam = param('classId').isUUID().withMessage('El ID de la clase debe ser un UUID válido');

const uploadValidation = [
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
  body('student_id')
    .optional()
    .isUUID()
    .withMessage('student_id debe ser un UUID válido'),
  body('class_id')
    .optional()
    .isUUID()
    .withMessage('class_id debe ser un UUID válido'),
  body().custom((value) => {
    const hasStudentId = value.student_id && value.student_id.trim() !== '';
    const hasClassId = value.class_id && value.class_id.trim() !== '';

    if (!hasStudentId && !hasClassId) {
      throw new Error('Debes indicar student_id o class_id');
    }

    return true;
  }),
];

router.use(authMiddleware);

router.post(
  '/',
  requireRole('teacher', 'admin'),
  handleUpload,
  uploadValidation,
  documentController.uploadDocument
);

router.get(
  '/',
  requireRole('teacher', 'student', 'admin'),
  documentController.getMyDocuments
);

router.get(
  '/class/:classId',
  classIdParam,
  requireRole('teacher', 'student', 'admin'),
  documentController.getClassDocuments
);

router.get(
  '/:id/download',
  uuidParam,
  requireRole('teacher', 'student', 'admin'),
  documentController.downloadDocument
);

router.delete(
  '/:id',
  uuidParam,
  requireRole('teacher', 'admin'),
  documentController.deleteDocument
);

module.exports = router;
