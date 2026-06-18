const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const getCorsOptions = require('../config/cors');
const conversationService = require('../services/conversationService');
const conversationRepository = require('../repositories/conversationRepository');

let io;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function emitConversationUpdates(socket, teacherConversation, studentConversation) {
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

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Token de autenticación no proporcionado'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Token inválido o expirado'));
  }
}

async function joinUserConversations(socket) {
  const conversations = await conversationRepository.findByUser(socket.user);

  conversations.forEach((conversation) => {
    socket.join(`conversation:${conversation.conversation_id}`);
  });
}

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: getCorsOptions.getAllowedOrigins(),
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    try {
      await joinUserConversations(socket);
    } catch (error) {
      console.error('Error al unir conversaciones del usuario:', error.message);
    }

    socket.on('conversation:join', async (payload) => {
      try {
        const conversationId = payload?.conversationId;

        if (!isValidUuid(conversationId)) {
          socket.emit('message:error', {
            message: 'conversationId debe ser un UUID válido',
          });
          return;
        }

        await conversationService.canAccessConversation(conversationId, socket.user);
        socket.join(`conversation:${conversationId}`);
      } catch (error) {
        socket.emit('message:error', { message: error.message });
      }
    });

    socket.on('conversation:leave', (payload) => {
      const conversationId = payload?.conversationId;

      if (!isValidUuid(conversationId)) {
        socket.emit('message:error', {
          message: 'conversationId debe ser un UUID válido',
        });
        return;
      }

      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('message:send', async (payload) => {
      try {
        const conversationId = payload?.conversationId;
        const content = payload?.content;

        if (!isValidUuid(conversationId)) {
          socket.emit('message:error', {
            message: 'conversationId debe ser un UUID válido',
          });
          return;
        }

        const result = await conversationService.sendMessage(
          conversationId,
          socket.user,
          content
        );

        io.to(`conversation:${conversationId}`).emit('message:new', {
          message: result.message,
        });

        emitConversationUpdates(
          socket,
          result.teacherConversation,
          result.studentConversation
        );
      } catch (error) {
        socket.emit('message:error', { message: error.message });
      }
    });

    socket.on('conversation:read', async (payload) => {
      try {
        const conversationId = payload?.conversationId;

        if (!isValidUuid(conversationId)) {
          socket.emit('message:error', {
            message: 'conversationId debe ser un UUID válido',
          });
          return;
        }

        const result = await conversationService.markConversationAsRead(
          conversationId,
          socket.user
        );

        emitConversationUpdates(
          socket,
          result.teacherConversation,
          result.studentConversation
        );
      } catch (error) {
        socket.emit('message:error', { message: error.message });
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = {
  initializeSocket,
  getIO,
};
