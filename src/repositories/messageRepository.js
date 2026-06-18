const pool = require('../config/db');

async function findByConversationId(conversationId) {
  const query = `
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      u.name AS sender_name,
      u.role AS sender_role,
      m.content,
      m.read_at,
      m.created_at
    FROM messages m
    INNER JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1
    ORDER BY m.created_at ASC
  `;
  const { rows } = await pool.query(query, [conversationId]);
  return rows;
}

async function create({ conversationId, senderId, content }) {
  const query = `
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES ($1, $2, $3)
    RETURNING id, conversation_id, sender_id, content, read_at, created_at
  `;
  const { rows } = await pool.query(query, [conversationId, senderId, content]);
  const message = rows[0];

  const senderQuery = `
    SELECT name, role
    FROM users
    WHERE id = $1
  `;
  const { rows: senderRows } = await pool.query(senderQuery, [senderId]);
  const sender = senderRows[0];

  return {
    ...message,
    sender_name: sender.name,
    sender_role: sender.role,
  };
}

async function markAsReadByConversation(conversationId, readerId) {
  const query = `
    UPDATE messages
    SET read_at = NOW()
    WHERE conversation_id = $1
      AND sender_id <> $2
      AND read_at IS NULL
    RETURNING id
  `;
  const { rows } = await pool.query(query, [conversationId, readerId]);
  return rows.length;
}

module.exports = {
  findByConversationId,
  create,
  markAsReadByConversation,
};
