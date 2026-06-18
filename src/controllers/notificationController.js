const notificationService = require('../services/notificationService');
const { getIO } = require('../socket/socket');

async function getNotifications(req, res, next) {
  try {
    const notifications = await notificationService.getMyNotifications(req.user);

    res.status(200).json({
      success: true,
      data: { notifications },
    });
  } catch (error) {
    next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const unread_count = await notificationService.getUnreadCount(req.user);

    res.status(200).json({
      success: true,
      data: { unread_count },
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationAsRead(
      req.params.id,
      req.user
    );

    const io = getIO();
    await notificationService.emitUnreadCountUpdate(io, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Notificación marcada como leída',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await notificationService.markAllNotificationsAsRead(req.user);

    const io = getIO();
    await notificationService.emitUnreadCountUpdate(io, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Notificaciones marcadas como leídas',
    });
  } catch (error) {
    next(error);
  }
}

async function deleteNotification(req, res, next) {
  try {
    await notificationService.deleteNotification(req.params.id, req.user);

    const io = getIO();
    await notificationService.emitUnreadCountUpdate(io, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Notificación eliminada correctamente',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
