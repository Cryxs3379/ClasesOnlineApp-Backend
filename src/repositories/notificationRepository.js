const pool = require('../config/db');

const NOTIFICATION_FIELDS = `
  id, user_id, title, message, type,
  related_entity_type, related_entity_id,
  is_read, created_at
`;

async function findByUserId(userId) {
  const query = `
    SELECT ${NOTIFICATION_FIELDS}
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
}

async function countUnreadByUserId(userId) {
  const query = `
    SELECT COUNT(*)::int AS unread_count
    FROM notifications
    WHERE user_id = $1 AND is_read = false
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0].unread_count;
}

async function create({
  userId,
  title,
  message,
  type,
  relatedEntityType,
  relatedEntityId,
}) {
  const query = `
    INSERT INTO notifications (
      user_id, title, message, type,
      related_entity_type, related_entity_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING ${NOTIFICATION_FIELDS}
  `;
  const { rows } = await pool.query(query, [
    userId,
    title,
    message,
    type,
    relatedEntityType || null,
    relatedEntityId || null,
  ]);
  return rows[0];
}

async function findById(notificationId) {
  const query = `
    SELECT ${NOTIFICATION_FIELDS}
    FROM notifications
    WHERE id = $1
  `;
  const { rows } = await pool.query(query, [notificationId]);
  return rows[0] || null;
}

async function markAsRead(notificationId, userId) {
  const query = `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1 AND user_id = $2
    RETURNING ${NOTIFICATION_FIELDS}
  `;
  const { rows } = await pool.query(query, [notificationId, userId]);
  return rows[0] || null;
}

async function markAllAsRead(userId) {
  const query = `
    UPDATE notifications
    SET is_read = true
    WHERE user_id = $1 AND is_read = false
    RETURNING id
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows.length;
}

async function deleteById(notificationId, userId) {
  const query = `
    DELETE FROM notifications
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const { rows } = await pool.query(query, [notificationId, userId]);
  return rows[0] || null;
}

module.exports = {
  findByUserId,
  countUnreadByUserId,
  create,
  findById,
  markAsRead,
  markAllAsRead,
  deleteById,
};
