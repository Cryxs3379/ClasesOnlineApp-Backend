const pool = require('../config/db');

async function create({ studentId, teacherId, startTime, endTime, jitsiRoomName }) {
  const query = `
    INSERT INTO classes (student_id, teacher_id, start_time, end_time, status, jitsi_room_name)
    VALUES ($1, $2, $3, $4, 'scheduled', $5)
    RETURNING id, student_id, teacher_id, start_time, end_time, status, jitsi_room_name, created_at
  `;
  const { rows } = await pool.query(query, [
    studentId,
    teacherId,
    startTime,
    endTime,
    jitsiRoomName,
  ]);
  return rows[0];
}

async function findById(id) {
  const query = `
    SELECT
      c.id,
      c.student_id,
      c.teacher_id,
      c.start_time,
      c.end_time,
      c.status,
      c.jitsi_room_name,
      c.created_at,
      s.name AS student_name,
      s.email AS student_email,
      t.name AS teacher_name,
      t.email AS teacher_email
    FROM classes c
    INNER JOIN users s ON s.id = c.student_id
    INNER JOIN users t ON t.id = c.teacher_id
    WHERE c.id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findByUserId(userId) {
  const query = `
    SELECT
      c.id,
      c.student_id,
      c.teacher_id,
      c.start_time,
      c.end_time,
      c.status,
      c.jitsi_room_name,
      c.created_at,
      s.name AS student_name,
      s.email AS student_email,
      t.name AS teacher_name,
      t.email AS teacher_email
    FROM classes c
    INNER JOIN users s ON s.id = c.student_id
    INNER JOIN users t ON t.id = c.teacher_id
    WHERE c.student_id = $1 OR c.teacher_id = $1
    ORDER BY c.start_time DESC
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
}

async function findAll() {
  const query = `
    SELECT
      c.id,
      c.student_id,
      c.teacher_id,
      c.start_time,
      c.end_time,
      c.status,
      c.jitsi_room_name,
      c.created_at,
      s.name AS student_name,
      s.email AS student_email,
      t.name AS teacher_name,
      t.email AS teacher_email
    FROM classes c
    INNER JOIN users s ON s.id = c.student_id
    INNER JOIN users t ON t.id = c.teacher_id
    ORDER BY c.start_time DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

module.exports = {
  create,
  findById,
  findByUserId,
  findAll,
};
