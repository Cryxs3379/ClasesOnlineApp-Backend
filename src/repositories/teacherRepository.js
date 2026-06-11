const pool = require('../config/db');

async function findByUserId(userId) {
  const query = `
    SELECT id, user_id, bio, hourly_price, subject, created_at
    FROM teacher_profiles
    WHERE user_id = $1
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

async function findById(id) {
  const query = `
    SELECT
      tp.id,
      tp.user_id,
      tp.bio,
      tp.hourly_price,
      tp.subject,
      tp.created_at,
      u.name,
      u.email
    FROM teacher_profiles tp
    INNER JOIN users u ON u.id = tp.user_id
    WHERE tp.id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findAll() {
  const query = `
    SELECT
      tp.id,
      tp.user_id,
      tp.bio,
      tp.hourly_price,
      tp.subject,
      tp.created_at,
      u.name,
      u.email
    FROM teacher_profiles tp
    INNER JOIN users u ON u.id = tp.user_id
    ORDER BY tp.created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function create({ userId, bio, hourlyPrice, subject }) {
  const query = `
    INSERT INTO teacher_profiles (user_id, bio, hourly_price, subject)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, bio, hourly_price, subject, created_at
  `;
  const { rows } = await pool.query(query, [userId, bio, hourlyPrice, subject]);
  return rows[0];
}

async function update({ userId, bio, hourlyPrice, subject }) {
  const query = `
    UPDATE teacher_profiles
    SET bio = $2, hourly_price = $3, subject = $4
    WHERE user_id = $1
    RETURNING id, user_id, bio, hourly_price, subject, created_at
  `;
  const { rows } = await pool.query(query, [userId, bio, hourlyPrice, subject]);
  return rows[0] || null;
}

async function findUserById(id) {
  const query = `
    SELECT id, name, email, role
    FROM users
    WHERE id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

module.exports = {
  findByUserId,
  findById,
  findAll,
  create,
  update,
  findUserById,
};
