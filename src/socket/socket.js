const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const getCorsOptions = require('../config/cors');
const conversationService = require('../services/conversationService');
const conversationRepository = require('../repositories/conversationRepository');
const notificationService = require('../services/notificationService');

let io;

const whiteboardState = new Map();
const MAX_WHITEBOARD_STROKES = 5000;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function getWhiteboardRoom(classId) {
  return `whiteboard:${classId}`;
}

function isValidWhiteboardPoint(point) {
  return (
    point &&
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    point.x >= 0 &&
    point.x <= 1 &&
    point.y >= 0 &&
    point.y <= 1
  );
}

function sanitizeWhiteboardStroke(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const classId = String(payload.classId || '').trim();

  if (!isValidUuid(classId)) {
    return null;
  }

  if (!isValidWhiteboardPoint(payload.from) || !isValidWhiteboardPoint(payload.to)) {
    return null;
  }

  const tool = payload.tool === 'eraser' ? 'eraser' : 'pen';

  const rawWidth = Number(payload.width);
  const safeWidth = Number.isFinite(rawWidth)
    ? Math.min(30, Math.max(1, rawWidth))
    : 4;

  const color =
    typeof payload.color === 'string' && payload.color.length <= 32
      ? payload.color
      : '#111827';

  const id =
    typeof payload.id === 'string' && payload.id.length <= 120
      ? payload.id
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    classId,
    tool,
    color,
    width: safeWidth,
    from: {
      x: payload.from.x,
      y: payload.from.y,
    },
    to: {
      x: payload.to.x,
      y: payload.to.y,
    },
    createdAt: new Date().toISOString(),
  };
}

function getWhiteboardState(classId) {
  return whiteboardState.get(classId) || { strokes: [] };
}

function addWhiteboardStroke(stroke) {
  const current = whiteboardState.get(stroke.classId) || { strokes: [] };

  current.strokes.push(stroke);

  if (current.strokes.length > MAX_WHITEBOARD_STROKES) {
    current.strokes = current.strokes.slice(-MAX_WHITEBOARD_STROKES);
  }

  whiteboardState.set(stroke.classId, current);

  return current;
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

        await notificationService.notifyNewMessage(io, {
          conversation: result.conversation,
          message: result.message,
        });
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

    socket.on('whiteboard:join', (payload) => {
      try {
        if (!socket.user?.id) {
          socket.emit('whiteboard:error', { message: 'Usuario no autenticado.' });
          return;
        }

        const classId = payload?.classId;

        if (!isValidUuid(classId)) {
          socket.emit('whiteboard:error', {
            message: 'classId debe ser un UUID válido.',
          });
          return;
        }

        // TODO: validar que el usuario pertenece a la clase antes de permitir acceso a la pizarra.

        socket.join(getWhiteboardRoom(classId));

        const state = getWhiteboardState(classId);

        socket.emit('whiteboard:state', {
          classId,
          strokes: state.strokes,
        });
      } catch (error) {
        socket.emit('whiteboard:error', { message: error.message });
      }
    });

    socket.on('whiteboard:leave', (payload) => {
      try {
        const classId = payload?.classId;

        if (!isValidUuid(classId)) {
          socket.emit('whiteboard:error', {
            message: 'classId debe ser un UUID válido.',
          });
          return;
        }

        socket.leave(getWhiteboardRoom(classId));
      } catch (error) {
        socket.emit('whiteboard:error', { message: error.message });
      }
    });

    socket.on('whiteboard:state:request', (payload) => {
      try {
        if (!socket.user?.id) {
          socket.emit('whiteboard:error', { message: 'Usuario no autenticado.' });
          return;
        }

        const classId = payload?.classId;

        if (!isValidUuid(classId)) {
          socket.emit('whiteboard:error', {
            message: 'classId debe ser un UUID válido.',
          });
          return;
        }

        const state = getWhiteboardState(classId);

        socket.emit('whiteboard:state', {
          classId,
          strokes: state.strokes,
        });
      } catch (error) {
        socket.emit('whiteboard:error', { message: error.message });
      }
    });

    socket.on('whiteboard:draw', (payload) => {
      try {
        if (!socket.user?.id) {
          socket.emit('whiteboard:error', { message: 'Usuario no autenticado.' });
          return;
        }

        const stroke = sanitizeWhiteboardStroke(payload);

        if (!stroke) {
          socket.emit('whiteboard:error', {
            message: 'Trazo de pizarra no válido.',
          });
          return;
        }

        // TODO: validar que el usuario pertenece a la clase.
        // TODO futuro: permitir dibujar solo a profesores/admin.

        addWhiteboardStroke(stroke);

        socket.to(getWhiteboardRoom(stroke.classId)).emit('whiteboard:draw', stroke);
      } catch (error) {
        socket.emit('whiteboard:error', { message: error.message });
      }
    });

    socket.on('whiteboard:clear', (payload) => {
      try {
        if (!socket.user?.id) {
          socket.emit('whiteboard:error', { message: 'Usuario no autenticado.' });
          return;
        }

        const classId = payload?.classId;

        if (!isValidUuid(classId)) {
          socket.emit('whiteboard:error', {
            message: 'classId debe ser un UUID válido.',
          });
          return;
        }

        // TODO: validar que el usuario pertenece a la clase.
        // TODO futuro: permitir limpiar solo a profesores/admin.

        whiteboardState.set(classId, { strokes: [] });

        io.to(getWhiteboardRoom(classId)).emit('whiteboard:clear', {
          classId,
        });
      } catch (error) {
        socket.emit('whiteboard:error', { message: error.message });
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

// Eventos de notificaciones emitidos desde notificationService:
// - notification:new       → { notification }
// - notifications:updated  → { unread_count }
//
// Eventos de pizarra:
// - whiteboard:join           cliente → servidor { classId }
// - whiteboard:leave          cliente → servidor { classId }
// - whiteboard:state:request  cliente → servidor { classId }
// - whiteboard:draw           cliente → servidor { classId, tool, color, width, from, to }
// - whiteboard:clear          cliente → servidor { classId }
// - whiteboard:state          servidor → cliente { classId, strokes }
// - whiteboard:draw           servidor → cliente stroke
// - whiteboard:clear          servidor → cliente { classId }
// - whiteboard:error          servidor → cliente { message }

module.exports = {
  initializeSocket,
  getIO,
};
