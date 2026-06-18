const pool = require('../config/db');

const ASSIGNMENT_FIELDS = `
  a.id,
  a.teacher_id,
  t.name AS teacher_name,
  a.student_id,
  s.name AS student_name,
  a.class_id,
  c.title AS class_title,
  a.title,
  a.description,
  a.due_date,
  a.status,
  a.submission_text,
  a.submission_file_path,
  a.submission_original_filename,
  a.submitted_at,
  a.reviewed_at,
  a.teacher_feedback,
  a.created_at,
  a.updated_at
`;

const ASSIGNMENT_FROM = `
  FROM assignments a
  INNER JOIN users t ON t.id = a.teacher_id
  INNER JOIN users s ON s.id = a.student_id
  LEFT JOIN classes c ON c.id = a.class_id
`;

const ORDER_BY = `
  ORDER BY
    CASE a.status
      WHEN 'pending' THEN 1
      WHEN 'submitted' THEN 2
      WHEN 'reviewed' THEN 3
      WHEN 'cancelled' THEN 4
      ELSE 5
    END,
    a.due_date ASC NULLS LAST,
    a.created_at DESC
`;

async function create({
  teacherId,
  studentId,
  classId,
  title,
  description,
  dueDate,
}) {
  const query = `
    INSERT INTO assignments (
      teacher_id, student_id, class_id, title, description, due_date, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    RETURNING
      id, teacher_id, student_id, class_id, title, description,
      due_date, status, submission_text, submission_file_path,
      submission_original_filename, submitted_at, reviewed_at,
      teacher_feedback, created_at, updated_at
  `;
  const { rows } = await pool.query(query, [
    teacherId,
    studentId,
    classId || null,
    title,
    description || null,
    dueDate || null,
  ]);
  return findById(rows[0].id);
}

async function findById(id) {
  const query = `
    SELECT ${ASSIGNMENT_FIELDS}
    ${ASSIGNMENT_FROM}
    WHERE a.id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findByTeacherId(teacherId) {
  const query = `
    SELECT ${ASSIGNMENT_FIELDS}
    ${ASSIGNMENT_FROM}
    WHERE a.teacher_id = $1
    ${ORDER_BY}
  `;
  const { rows } = await pool.query(query, [teacherId]);
  return rows;
}

async function findByStudentId(studentId) {
  const query = `
    SELECT ${ASSIGNMENT_FIELDS}
    ${ASSIGNMENT_FROM}
    WHERE a.student_id = $1
    ${ORDER_BY}
  `;
  const { rows } = await pool.query(query, [studentId]);
  return rows;
}

async function findAll() {
  const query = `
    SELECT ${ASSIGNMENT_FIELDS}
    ${ASSIGNMENT_FROM}
    ${ORDER_BY}
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function findByUser(user) {
  if (user.role === 'admin') {
    return findAll();
  }
  if (user.role === 'teacher') {
    return findByTeacherId(user.id);
  }
  if (user.role === 'student') {
    return findByStudentId(user.id);
  }
  return [];
}

async function update(id, { title, description, dueDate, status }) {
  const query = `
    UPDATE assignments
    SET
      title = COALESCE($2, title),
      description = COALESCE($3, description),
      due_date = COALESCE($4, due_date),
      status = COALESCE($5, status),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `;
  const { rows } = await pool.query(query, [
    id,
    title,
    description,
    dueDate,
    status,
  ]);
  return rows[0] ? findById(rows[0].id) : null;
}

async function submit(id, { submissionText, submissionFilePath, submissionOriginalFilename }) {
  const query = `
    UPDATE assignments
    SET
      submission_text = $2,
      submission_file_path = $3,
      submission_original_filename = $4,
      status = 'submitted',
      submitted_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `;
  const { rows } = await pool.query(query, [
    id,
    submissionText || null,
    submissionFilePath || null,
    submissionOriginalFilename || null,
  ]);
  return rows[0] ? findById(rows[0].id) : null;
}

async function review(id, { teacherFeedback }) {
  const query = `
    UPDATE assignments
    SET
      status = 'reviewed',
      teacher_feedback = $2,
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
  `;
  const { rows } = await pool.query(query, [id, teacherFeedback || null]);
  return rows[0] ? findById(rows[0].id) : null;
}

async function deleteById(id) {
  const query = `
    DELETE FROM assignments
    WHERE id = $1
    RETURNING id, submission_file_path
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

module.exports = {
  create,
  findById,
  findByUser,
  findByTeacherId,
  findByStudentId,
  update,
  submit,
  review,
  deleteById,
};
