const { validationResult } = require('express-validator');
const conversationService = require('../services/conversationService');
const notificationService = require('../services/notificationService');
const { getIO } = require('../socket/socket');
const AppError = require('../utils/AppError');

function emitConversationUpdates(io, teacherConversation, studentConversation) {
  if (!io) return;

  if (teacherConversation) {
    io.to(`user:${teacherConversation.teacher_id}`).emit('conversation:updated', {
      conversation: teacherConversation,
    });
  }

  if (studentConversation) {
    io.to(`user:${studentConversation.student_id}`).emit('conversation:updated', {
      conversation: studentConversation,
    });
  }
}

function handleValidationErrors(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((err) => err.msg)
      .join('. ');
    throw new AppError(message, 400);
  }
}

async function getConversations(req, res, next) {
  try {
    const conversations = await conversationService.getMyConversations(req.user);

    res.status(200).json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const messages = await conversationService.getConversationMessages(
      req.params.id,
      req.user
    );

    res.status(200).json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    handleValidationErrors(req);

    const result = await conversationService.sendMessage(
      req.params.id,
      req.user,
      req.body.content
    );

    const io = getIO();
    if (io) {
      io.to(`conversation:${req.params.id}`).emit('message:new', {
        message: result.message,
      });
      emitConversationUpdates(io, result.teacherConversation, result.studentConversation);
      await notificationService.notifyNewMessage(io, {
        conversation: result.conversation,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const result = await conversationService.markConversationAsRead(
      req.params.id,
      req.user
    );

    const io = getIO();
    emitConversationUpdates(io, result.teacherConversation, result.studentConversation);

    res.status(200).json({
      success: true,
      message: 'Conversación marcada como leída',
      data: { conversation: result.conversation },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
};
