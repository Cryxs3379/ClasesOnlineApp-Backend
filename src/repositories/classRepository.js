const pool = require('../config/db');

const CLASS_FIELDS = `
  c.id,
  c.teacher_id,
  c.student_id,
  c.title,
  c.description,
  c.start_time,
  c.end_time,
  c.status,
  c.jitsi_room_name,
  c.created_at,
  c.updated_at,
  s.name AS student_name,
  s.email AS student_email,
  t.name AS teacher_name,
  t.email AS teacher_email
`;

async function create({
  teacherId,
  studentId,
  title,
  description,
  startTime,
  endTime,
  jitsiRoomName,
}) {
  const query = `
    INSERT INTO classes (
      teacher_id, student_id, title, description,
      start_time, end_time, status, jitsi_room_name
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
    RETURNING
      id, teacher_id, student_id, title, description,
      start_time, end_time, status, jitsi_room_name, created_at, updated_at
  `;
  const { rows } = await pool.query(query, [
    teacherId,
    studentId,
    title,
    description || null,
    startTime,
    endTime,
    jitsiRoomName,
  ]);
  return rows[0];
}

async function findById(id) {
  const query = `
    SELECT ${CLASS_FIELDS}
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
    SELECT ${CLASS_FIELDS}
    FROM classes c
    INNER JOIN users s ON s.id = c.student_id
    INNER JOIN users t ON t.id = c.teacher_id
    WHERE c.student_id = $1 OR c.teacher_id = $1
    ORDER BY c.start_time DESC
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
}

async function findByTeacherId(teacherId) {
  const query = `
    SELECT ${CLASS_FIELDS}
    FROM classes c
    INNER JOIN users s ON s.id = c.student_id
    INNER JOIN users t ON t.id = c.teacher_id
    WHERE c.teacher_id = $1
    ORDER BY c.start_time DESC
  `;
  const { rows } = await pool.query(query, [teacherId]);
  return rows;
}

async function findByStudentId(studentId) {
  const query = `
    SELECT ${CLASS_FIELDS}
    FROM classes c
    INNER JOIN users s ON s.id = c.student_id
    INNER JOIN users t ON t.id = c.teacher_id
    WHERE c.student_id = $1
    ORDER BY c.start_time DESC
  `;
  const { rows } = await pool.query(query, [studentId]);
  return rows;
}

async function findAll() {
  const query = `
    SELECT ${CLASS_FIELDS}
    FROM classes c
    INNER JOIN users s ON s.id = c.student_id
    INNER JOIN users t ON t.id = c.teacher_id
    ORDER BY c.start_time DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function updateStatus(classId, status) {
  const query = `
    UPDATE classes
    SET status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING
      id, teacher_id, student_id, title, description,
      start_time, end_time, status, jitsi_room_name, created_at, updated_at
  `;
  const { rows } = await pool.query(query, [classId, status]);
  return rows[0] || null;
}

async function findClassForTeacher(classId, teacherId) {
  const query = `
    SELECT ${CLASS_FIELDS}
    FROM classes c
    INNER JOIN users s ON s.id = c.student_id
    INNER JOIN users t ON t.id = c.teacher_id
    WHERE c.id = $1 AND c.teacher_id = $2
  `;
  const { rows } = await pool.query(query, [classId, teacherId]);
  return rows[0] || null;
}

async function findClassForStudent(classId, studentId) {
  const query = `
    SELECT ${CLASS_FIELDS}
    FROM classes c
    INNER JOIN users s ON s.id = c.student_id
    INNER JOIN users t ON t.id = c.teacher_id
    WHERE c.id = $1 AND c.student_id = $2
  `;
  const { rows } = await pool.query(query, [classId, studentId]);
  return rows[0] || null;
}

module.exports = {
  create,
  findById,
  findByUserId,
  findByTeacherId,
  findByStudentId,
  findAll,
  updateStatus,
  findClassForTeacher,
  findClassForStudent,
};
