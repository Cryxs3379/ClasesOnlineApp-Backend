const pool = require('../config/db');

const DOCUMENT_FIELDS = `
  d.id,
  d.teacher_id,
  d.student_id,
  d.class_id,
  d.title,
  d.description,
  d.original_filename,
  d.stored_filename,
  d.file_path,
  d.file_type,
  d.file_size,
  d.created_at,
  s.name AS student_name,
  c.title AS class_title,
  t.name AS teacher_name
`;

const DOCUMENT_FROM = `
  FROM documents d
  LEFT JOIN users s ON s.id = d.student_id
  LEFT JOIN classes c ON c.id = d.class_id
  INNER JOIN users t ON t.id = d.teacher_id
`;

async function create({
  teacherId,
  studentId,
  classId,
  title,
  description,
  originalFilename,
  storedFilename,
  filePath,
  fileType,
  fileSize,
}) {
  const query = `
    INSERT INTO documents (
      teacher_id, student_id, class_id, title, description,
      original_filename, stored_filename, file_path, file_type, file_size
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING
      id, teacher_id, student_id, class_id, title, description,
      original_filename, stored_filename, file_path, file_type, file_size, created_at
  `;
  const { rows } = await pool.query(query, [
    teacherId,
    studentId || null,
    classId || null,
    title,
    description || null,
    originalFilename,
    storedFilename,
    filePath,
    fileType,
    fileSize,
  ]);
  return rows[0];
}

async function findById(id) {
  const query = `
    SELECT ${DOCUMENT_FIELDS}
    ${DOCUMENT_FROM}
    WHERE d.id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findByTeacherId(teacherId) {
  const query = `
    SELECT ${DOCUMENT_FIELDS}
    ${DOCUMENT_FROM}
    WHERE d.teacher_id = $1
    ORDER BY d.created_at DESC
  `;
  const { rows } = await pool.query(query, [teacherId]);
  return rows;
}

async function findByStudentId(studentId) {
  const query = `
    SELECT ${DOCUMENT_FIELDS}
    ${DOCUMENT_FROM}
    WHERE d.student_id = $1
       OR d.class_id IN (
         SELECT id FROM classes WHERE student_id = $1
       )
    ORDER BY d.created_at DESC
  `;
  const { rows } = await pool.query(query, [studentId]);
  return rows;
}

async function findByClassId(classId) {
  const query = `
    SELECT ${DOCUMENT_FIELDS}
    ${DOCUMENT_FROM}
    WHERE d.class_id = $1
    ORDER BY d.created_at DESC
  `;
  const { rows } = await pool.query(query, [classId]);
  return rows;
}

async function findAll() {
  const query = `
    SELECT ${DOCUMENT_FIELDS}
    ${DOCUMENT_FROM}
    ORDER BY d.created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function deleteById(id) {
  const query = `
    DELETE FROM documents
    WHERE id = $1
    RETURNING id, file_path
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

module.exports = {
  create,
  findById,
  findByTeacherId,
  findByStudentId,
  findByClassId,
  findAll,
  deleteById,
};
