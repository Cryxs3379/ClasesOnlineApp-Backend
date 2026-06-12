const pool = require('../config/db');

const USER_PUBLIC_FIELDS = `
  id, name, email, role, teacher_id, is_active, created_at
`;

async function findByEmail(email) {
  const query = `
    SELECT id, name, email, password_hash, role, teacher_id, is_active, created_at
    FROM users
    WHERE email = $1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const query = `
    SELECT ${USER_PUBLIC_FIELDS}
    FROM users
    WHERE id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findActiveById(id) {
  const query = `
    SELECT ${USER_PUBLIC_FIELDS}
    FROM users
    WHERE id = $1 AND is_active = true
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function createTeacher({ name, email, passwordHash }) {
  const query = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, 'teacher')
    RETURNING ${USER_PUBLIC_FIELDS}
  `;
  const { rows } = await pool.query(query, [name, email, passwordHash]);
  return rows[0];
}

async function createAdmin({ name, email, passwordHash }) {
  const query = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, 'admin')
    RETURNING ${USER_PUBLIC_FIELDS}
  `;
  const { rows } = await pool.query(query, [name, email, passwordHash]);
  return rows[0];
}

async function createStudent({ name, email, passwordHash, teacherId }) {
  const query = `
    INSERT INTO users (name, email, password_hash, role, teacher_id)
    VALUES ($1, $2, $3, 'student', $4)
    RETURNING ${USER_PUBLIC_FIELDS}
  `;
  const { rows } = await pool.query(query, [name, email, passwordHash, teacherId]);
  return rows[0];
}

async function findStudentsByTeacherId(teacherId) {
  const query = `
    SELECT ${USER_PUBLIC_FIELDS}
    FROM users
    WHERE teacher_id = $1 AND role = 'student'
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(query, [teacherId]);
  return rows;
}

async function findStudentByIdForTeacher(studentId, teacherId) {
  const query = `
    SELECT ${USER_PUBLIC_FIELDS}
    FROM users
    WHERE id = $1 AND teacher_id = $2 AND role = 'student'
  `;
  const { rows } = await pool.query(query, [studentId, teacherId]);
  return rows[0] || null;
}

module.exports = {
  findByEmail,
  findById,
  findActiveById,
  createTeacher,
  createAdmin,
  createStudent,
  findStudentsByTeacherId,
  findStudentByIdForTeacher,
};
