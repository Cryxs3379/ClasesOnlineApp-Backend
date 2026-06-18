const express = require('express');
const { body, param } = require('express-validator');
const assignmentController = require('../controllers/assignmentController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const { handleAssignmentUpload } = require('../middlewares/assignmentUploadMiddleware');
const { optionalAttachmentUpload } = require('../middlewares/assignmentAttachmentUploadMiddleware');

const router = express.Router();

const assignmentIdParam = param('id')
  .isUUID()
  .withMessage('El ID de la tarea debe ser un UUID válido');

const createValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('El título es obligatorio')
    .isLength({ max: 255 })
    .withMessage('El título no puede superar los 255 caracteres'),
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
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('due_date debe tener formato ISO 8601'),
  body().custom((value) => {
    const hasStudentId = value.student_id && value.student_id.trim() !== '';
    const hasClassId = value.class_id && value.class_id.trim() !== '';

    if (!hasStudentId && !hasClassId) {
      throw new Error('Debes indicar student_id o class_id');
    }

    return true;
  }),
];

const updateValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El título no puede estar vacío')
    .isLength({ max: 255 })
    .withMessage('El título no puede superar los 255 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede superar los 2000 caracteres'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('due_date debe tener formato ISO 8601'),
  body('status')
    .optional()
    .isIn(['pending', 'submitted', 'reviewed', 'cancelled'])
    .withMessage('El estado debe ser pending, submitted, reviewed o cancelled'),
];

const submitValidation = [
  body('submission_text')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('El texto de entrega no puede superar los 5000 caracteres'),
];

const reviewValidation = [
  body('teacher_feedback')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('El feedback no puede superar los 2000 caracteres'),
];

router.use(authMiddleware);

router.post(
  '/',
  requireRole('teacher', 'admin'),
  optionalAttachmentUpload,
  createValidation,
  assignmentController.createAssignment
);

router.get(
  '/',
  requireRole('teacher', 'student', 'admin'),
  assignmentController.getAssignments
);

router.get(
  '/:id/submission-file',
  assignmentIdParam,
  requireRole('teacher', 'student', 'admin'),
  assignmentController.downloadSubmissionFile
);

router.get(
  '/:id/attachment-file',
  assignmentIdParam,
  requireRole('teacher', 'student', 'admin'),
  assignmentController.downloadAttachmentFile
);

router.post(
  '/:id/submit',
  assignmentIdParam,
  requireRole('student'),
  handleAssignmentUpload,
  submitValidation,
  assignmentController.submitAssignment
);

router.patch(
  '/:id/review',
  assignmentIdParam,
  requireRole('teacher', 'admin'),
  reviewValidation,
  assignmentController.reviewAssignment
);

router.get(
  '/:id',
  assignmentIdParam,
  requireRole('teacher', 'student', 'admin'),
  assignmentController.getAssignmentById
);

router.patch(
  '/:id',
  assignmentIdParam,
  requireRole('teacher', 'admin'),
  optionalAttachmentUpload,
  updateValidation,
  assignmentController.updateAssignment
);

router.delete(
  '/:id',
  assignmentIdParam,
  requireRole('teacher', 'admin'),
  assignmentController.deleteAssignment
);

module.exports = router;
