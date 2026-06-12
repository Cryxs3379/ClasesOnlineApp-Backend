const pool = require('../config/db');

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

module.exports = {
  createIfNotExists,
};
