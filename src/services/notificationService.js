const notificationRepository = require('../repositories/notificationRepository');
const classRepository = require('../repositories/classRepository');
const AppError = require('../utils/AppError');

async function emitUnreadCountUpdate(io, userId) {
  if (!io) {
    return;
  }

  const unread_count = await notificationRepository.countUnreadByUserId(userId);
  io.to(`user:${userId}`).emit('notifications:updated', { unread_count });
}

async function notifyUser(io, data) {
  const notification = await notificationRepository.create(data);
  await emitUnreadCountUpdate(io, data.userId);

  if (io) {
    io.to(`user:${data.userId}`).emit('notification:new', { notification });
  }

  return notification;
}

async function notifyUserSafely(io, data) {
  try {
    return await notifyUser(io, data);
  } catch (error) {
    console.error('Error al enviar notificación:', error.message);
    return null;
  }
}

async function getMyNotifications(user) {
  return notificationRepository.findByUserId(user.id);
}

async function getUnreadCount(user) {
  const unread_count = await notificationRepository.countUnreadByUserId(user.id);
  return unread_count;
}

async function createNotification(data) {
  return notificationRepository.create(data);
}

async function markNotificationAsRead(notificationId, user) {
  const notification = await notificationRepository.markAsRead(notificationId, user.id);

  if (!notification) {
    const exists = await notificationRepository.findById(notificationId);
    if (!exists) {
      throw new AppError('Notificación no encontrada', 404);
    }
    throw new AppError('No tienes permisos para modificar esta notificación', 403);
  }

  return notification;
}

async function markAllNotificationsAsRead(user) {
  return notificationRepository.markAllAsRead(user.id);
}

async function deleteNotification(notificationId, user) {
  const deleted = await notificationRepository.deleteById(notificationId, user.id);

  if (!deleted) {
    const exists = await notificationRepository.findById(notificationId);
    if (!exists) {
      throw new AppError('Notificación no encontrada', 404);
    }
    throw new AppError('No tienes permisos para eliminar esta notificación', 403);
  }

  return deleted;
}

async function notifyNewMessage(io, { conversation, message }) {
  const conversationId = conversation.conversation_id || conversation.id;
  const receiverId =
    message.sender_id === conversation.teacher_id
      ? conversation.student_id
      : conversation.teacher_id;

  if (!receiverId || receiverId === message.sender_id) {
    return null;
  }

  return notifyUserSafely(io, {
    userId: receiverId,
    title: 'Nuevo mensaje',
    message: `Nuevo mensaje de ${message.sender_name}`,
    type: 'message',
    relatedEntityType: 'conversation',
    relatedEntityId: conversationId,
  });
}

async function notifyNewDocument(io, document, uploaderId) {
  const studentIds = new Set();

  if (document.student_id) {
    studentIds.add(document.student_id);
  }

  if (document.class_id) {
    const classData = await classRepository.findById(document.class_id);
    if (classData?.student_id) {
      studentIds.add(classData.student_id);
    }
  }

  const notifications = [];

  for (const studentId of studentIds) {
    if (studentId === uploaderId) {
      continue;
    }

    const notification = await notifyUserSafely(io, {
      userId: studentId,
      title: 'Nuevo documento',
      message: `Nuevo documento disponible: ${document.title}`,
      type: 'document',
      relatedEntityType: 'document',
      relatedEntityId: document.id,
    });

    if (notification) {
      notifications.push(notification);
    }
  }

  return notifications;
}

async function notifyNewClass(io, classData) {
  if (!classData.student_id) {
    return null;
  }

  return notifyUserSafely(io, {
    userId: classData.student_id,
    title: 'Nueva clase programada',
    message: `Nueva clase programada: ${classData.title}`,
    type: 'class',
    relatedEntityType: 'class',
    relatedEntityId: classData.id,
  });
}

async function notifyClassCancelled(io, classData) {
  if (!classData.student_id) {
    return null;
  }

  return notifyUserSafely(io, {
    userId: classData.student_id,
    title: 'Clase cancelada',
    message: `Se ha cancelado la clase: ${classData.title}`,
    type: 'class',
    relatedEntityType: 'class',
    relatedEntityId: classData.id,
  });
}

async function notifyNewAssignment(io, assignment) {
  if (!assignment?.student_id) {
    return null;
  }

  return notifyUserSafely(io, {
    userId: assignment.student_id,
    title: 'Nueva tarea',
    message: `Nueva tarea disponible: ${assignment.title}`,
    type: 'assignment',
    relatedEntityType: 'assignment',
    relatedEntityId: assignment.id,
  });
}

async function notifyAssignmentSubmitted(io, assignment) {
  if (!assignment?.teacher_id) {
    return null;
  }

  const studentName = assignment.student_name || 'Un alumno';

  return notifyUserSafely(io, {
    userId: assignment.teacher_id,
    title: 'Tarea entregada',
    message: `${studentName} ha entregado: ${assignment.title}`,
    type: 'assignment',
    relatedEntityType: 'assignment',
    relatedEntityId: assignment.id,
  });
}

async function notifyAssignmentReviewed(io, assignment) {
  if (!assignment?.student_id) {
    return null;
  }

  return notifyUserSafely(io, {
    userId: assignment.student_id,
    title: 'Tarea revisada',
    message: `Tu tarea ha sido revisada: ${assignment.title}`,
    type: 'assignment',
    relatedEntityType: 'assignment',
    relatedEntityId: assignment.id,
  });
}

module.exports = {
  getMyNotifications,
  getUnreadCount,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  notifyUser,
  notifyUserSafely,
  emitUnreadCountUpdate,
  notifyNewMessage,
  notifyNewDocument,
  notifyNewClass,
  notifyClassCancelled,
  notifyNewAssignment,
  notifyAssignmentSubmitted,
  notifyAssignmentReviewed,
};
