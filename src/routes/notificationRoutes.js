const express = require('express');
const { param } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

const notificationIdParam = param('id')
  .isUUID()
  .withMessage('El ID de la notificación debe ser un UUID válido');

router.use(authMiddleware, requireRole('teacher', 'student', 'admin'));

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationIdParam, notificationController.markAsRead);
router.delete('/:id', notificationIdParam, notificationController.deleteNotification);

module.exports = router;
