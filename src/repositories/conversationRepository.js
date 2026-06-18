const pool = require('../config/db');

function buildConversationSelect(userIdParam) {
  return `
    c.id AS conversation_id,
    c.teacher_id,
    t.name AS teacher_name,
    t.email AS teacher_email,
    c.student_id,
    s.name AS student_name,
    s.email AS student_email,
    c.created_at,
    lm.content AS last_message,
    lm.created_at AS last_message_at,
    (
      SELECT COUNT(*)::int
      FROM messages m
      WHERE m.conversation_id = c.id
        AND m.read_at IS NULL
        AND m.sender_id <> ${userIdParam}
    ) AS unread_count
  `;
}

const CONVERSATION_FROM = `
  FROM conversations c
  INNER JOIN users t ON t.id = c.teacher_id
  INNER JOIN users s ON s.id = c.student_id
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) lm ON true
`;

async function createIfNotExists(teacherId, studentId) {
  const query = `
    INSERT INTO conversations (teacher_id, student_id)
    VALUES ($1, $2)
    ON CONFLICT (teacher_id, student_id) DO NOTHING
    RETURNING id
  `;
  const { rows } = await pool.query(query, [teacherId, studentId]);
  return rows[0] || null;
}

async function findById(id) {
  const query = `
    SELECT
      c.id AS conversation_id,
      c.teacher_id,
      t.name AS teacher_name,
      t.email AS teacher_email,
      c.student_id,
      s.name AS student_name,
      s.email AS student_email,
      c.created_at
    FROM conversations c
    INNER JOIN users t ON t.id = c.teacher_id
    INNER JOIN users s ON s.id = c.student_id
    WHERE c.id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findByIdForUser(conversationId, userId) {
  const query = `
    SELECT ${buildConversationSelect('$2')}
    ${CONVERSATION_FROM}
    WHERE c.id = $1
  `;
  const { rows } = await pool.query(query, [conversationId, userId]);
  return rows[0] || null;
}

async function findByUser(user) {
  let query;
  let params;

  if (user.role === 'admin') {
    query = `
      SELECT ${buildConversationSelect('$1')}
      ${CONVERSATION_FROM}
      ORDER BY COALESCE(lm.created_at, c.created_at) DESC
    `;
    params = [user.id];
  } else if (user.role === 'teacher') {
    query = `
      SELECT ${buildConversationSelect('$2')}
      ${CONVERSATION_FROM}
      WHERE c.teacher_id = $1
      ORDER BY COALESCE(lm.created_at, c.created_at) DESC
    `;
    params = [user.id, user.id];
  } else if (user.role === 'student') {
    query = `
      SELECT ${buildConversationSelect('$2')}
      ${CONVERSATION_FROM}
      WHERE c.student_id = $1
      ORDER BY COALESCE(lm.created_at, c.created_at) DESC
    `;
    params = [user.id, user.id];
  } else {
    return [];
  }

  const { rows } = await pool.query(query, params);
  return rows;
}

async function findAll() {
  const query = `
    SELECT
      c.id AS conversation_id,
      c.teacher_id,
      t.name AS teacher_name,
      t.email AS teacher_email,
      c.student_id,
      s.name AS student_name,
      s.email AS student_email,
      c.created_at,
      lm.content AS last_message,
      lm.created_at AS last_message_at,
      0 AS unread_count
    ${CONVERSATION_FROM}
    ORDER BY COALESCE(lm.created_at, c.created_at) DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function userBelongsToConversation(conversationId, user) {
  const conversation = await findById(conversationId);
  if (!conversation) {
    return null;
  }

  if (user.role === 'admin') {
    return conversation;
  }

  if (user.role === 'teacher' && conversation.teacher_id === user.id) {
    return conversation;
  }

  if (user.role === 'student' && conversation.student_id === user.id) {
    return conversation;
  }

  return null;
}

async function markMessagesAsRead(conversationId, userId) {
  const messageRepository = require('./messageRepository');
  return messageRepository.markAsReadByConversation(conversationId, userId);
}

module.exports = {
  createIfNotExists,
  findById,
  findByIdForUser,
  findByUser,
  findAll,
  userBelongsToConversation,
  markMessagesAsRead,
};
