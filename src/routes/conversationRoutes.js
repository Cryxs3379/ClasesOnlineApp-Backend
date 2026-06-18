const express = require('express');
const { body, param } = require('express-validator');
const conversationController = require('../controllers/conversationController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

const conversationIdParam = param('id')
  .isUUID()
  .withMessage('El ID de la conversación debe ser un UUID válido');

const sendMessageValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('El contenido del mensaje es obligatorio')
    .isLength({ max: 2000 })
    .withMessage('El mensaje no puede superar los 2000 caracteres'),
];

router.use(authMiddleware);

router.get(
  '/',
  requireRole('teacher', 'student', 'admin'),
  conversationController.getConversations
);
router.get(
  '/:id/messages',
  conversationIdParam,
  requireRole('teacher', 'student', 'admin'),
  conversationController.getMessages
);
router.post(
  '/:id/messages',
  conversationIdParam,
  requireRole('teacher', 'student'),
  sendMessageValidation,
  conversationController.sendMessage
);
router.patch(
  '/:id/read',
  conversationIdParam,
  requireRole('teacher', 'student', 'admin'),
  conversationController.markAsRead
);

module.exports = router;
