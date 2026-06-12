const pool = require('../config/db');

async function updateStatus(studentId, teacherId, isActive) {
  const query = `
    UPDATE users
    SET is_active = $3, updated_at = NOW()
    WHERE id = $1 AND teacher_id = $2 AND role = 'student'
    RETURNING id, name, email, role, teacher_id, is_active, created_at
  `;
  const { rows } = await pool.query(query, [studentId, teacherId, isActive]);
  return rows[0] || null;
}

module.exports = {
  updateStatus,
};
