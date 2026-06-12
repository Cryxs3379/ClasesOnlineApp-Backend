const pool = require('../config/db');

const PROFILE_FIELDS = `
  id, teacher_id, bio, subject, hourly_rate, avatar_url, created_at, updated_at
`;

async function findByTeacherId(teacherId) {
  const query = `
    SELECT ${PROFILE_FIELDS}
    FROM teacher_profiles
    WHERE teacher_id = $1
  `;
  const { rows } = await pool.query(query, [teacherId]);
  return rows[0] || null;
}

async function findById(id) {
  const query = `
    SELECT
      tp.id,
      tp.teacher_id,
      tp.bio,
      tp.subject,
      tp.hourly_rate,
      tp.avatar_url,
      tp.created_at,
      tp.updated_at,
      u.name,
      u.email
    FROM teacher_profiles tp
    INNER JOIN users u ON u.id = tp.teacher_id
    WHERE tp.id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findAll() {
  const query = `
    SELECT
      tp.id,
      tp.teacher_id,
      tp.bio,
      tp.subject,
      tp.hourly_rate,
      tp.avatar_url,
      tp.created_at,
      tp.updated_at,
      u.name,
      u.email
    FROM teacher_profiles tp
    INNER JOIN users u ON u.id = tp.teacher_id
    ORDER BY tp.created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function create({ teacherId, bio, hourlyRate, subject, avatarUrl }) {
  const query = `
    INSERT INTO teacher_profiles (teacher_id, bio, hourly_rate, subject, avatar_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${PROFILE_FIELDS}
  `;
  const { rows } = await pool.query(query, [
    teacherId,
    bio,
    hourlyRate,
    subject,
    avatarUrl || null,
  ]);
  return rows[0];
}

async function update({ teacherId, bio, hourlyRate, subject, avatarUrl }) {
  const query = `
    UPDATE teacher_profiles
    SET bio = $2,
        hourly_rate = $3,
        subject = $4,
        avatar_url = $5,
        updated_at = NOW()
    WHERE teacher_id = $1
    RETURNING ${PROFILE_FIELDS}
  `;
  const { rows } = await pool.query(query, [
    teacherId,
    bio,
    hourlyRate,
    subject,
    avatarUrl || null,
  ]);
  return rows[0] || null;
}

async function findUserById(id) {
  const query = `
    SELECT id, name, email, role, teacher_id, is_active
    FROM users
    WHERE id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

module.exports = {
  findByTeacherId,
  findById,
  findAll,
  create,
  update,
  findUserById,
};
