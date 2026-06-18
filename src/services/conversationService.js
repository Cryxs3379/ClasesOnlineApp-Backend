const conversationRepository = require('../repositories/conversationRepository');
const messageRepository = require('../repositories/messageRepository');
const AppError = require('../utils/AppError');

const MAX_CONTENT_LENGTH = 2000;

function validateContent(content) {
  if (!content || !content.trim()) {
    throw new AppError('El contenido del mensaje es obligatorio', 400);
  }

  if (content.trim().length > MAX_CONTENT_LENGTH) {
    throw new AppError('El mensaje no puede superar los 2000 caracteres', 400);
  }

  return content.trim();
}

async function canAccessConversation(conversationId, user) {
  const conversation = await conversationRepository.userBelongsToConversation(
    conversationId,
    user
  );

  if (!conversation) {
    const exists = await conversationRepository.findById(conversationId);
    if (!exists) {
      throw new AppError('Conversación no encontrada', 404);
    }
    throw new AppError('No tienes permisos para acceder a esta conversación', 403);
  }

  return conversation;
}

async function getMyConversations(user) {
  return conversationRepository.findByUser(user);
}

async function getConversationMessages(conversationId, user) {
  await canAccessConversation(conversationId, user);
  return messageRepository.findByConversationId(conversationId);
}

async function sendMessage(conversationId, user, content) {
  if (user.role === 'admin') {
    throw new AppError('Los administradores no pueden enviar mensajes', 403);
  }

  const conversation = await canAccessConversation(conversationId, user);
  const trimmedContent = validateContent(content);

  const message = await messageRepository.create({
    conversationId,
    senderId: user.id,
    content: trimmedContent,
  });

  const teacherConversation = await conversationRepository.findByIdForUser(
    conversationId,
    conversation.teacher_id
  );
  const studentConversation = await conversationRepository.findByIdForUser(
    conversationId,
    conversation.student_id
  );

  return {
    message,
    conversation,
    teacherConversation,
    studentConversation,
  };
}

async function markConversationAsRead(conversationId, user) {
  const conversation = await canAccessConversation(conversationId, user);

  await conversationRepository.markMessagesAsRead(conversationId, user.id);

  const updatedConversation = await conversationRepository.findByIdForUser(
    conversationId,
    user.id
  );

  const teacherConversation = await conversationRepository.findByIdForUser(
    conversationId,
    conversation.teacher_id
  );
  const studentConversation = await conversationRepository.findByIdForUser(
    conversationId,
    conversation.student_id
  );

  return {
    conversation: updatedConversation,
    teacherConversation,
    studentConversation,
  };
}

module.exports = {
  getMyConversations,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
  canAccessConversation,
};
