const assignmentRepository = require('../repositories/assignmentRepository');
const userRepository = require('../repositories/userRepository');
const classRepository = require('../repositories/classRepository');
const { deleteFileIfExists } = require('../utils/fileUtils');
const AppError = require('../utils/AppError');

const VALID_STATUSES = ['pending', 'submitted', 'reviewed', 'cancelled'];

function normalizeOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value;
}

function canAccessAssignment(assignment, user) {
  if (user.role === 'admin') {
    return true;
  }
  if (user.role === 'teacher') {
    return assignment.teacher_id === user.id;
  }
  if (user.role === 'student') {
    return assignment.student_id === user.id;
  }
  return false;
}

async function validateStudentForTeacher(studentId, teacherId) {
  const student = await userRepository.findStudentByIdForTeacher(studentId, teacherId);
  if (!student) {
    throw new AppError('El alumno no existe o no pertenece a este profesor', 404);
  }
  return student;
}

async function validateClassForTeacher(classId, teacherId) {
  const classData = await classRepository.findClassForTeacher(classId, teacherId);
  if (!classData) {
    throw new AppError('La clase no existe o no pertenece a este profesor', 404);
  }
  return classData;
}

async function resolveStudentAndClass(user, studentId, classId) {
  let resolvedStudentId = normalizeOptionalId(studentId);
  let resolvedClassId = normalizeOptionalId(classId);

  if (!resolvedStudentId && !resolvedClassId) {
    throw new AppError('Debes indicar student_id o class_id', 400);
  }

  if (user.role === 'admin') {
    if (resolvedClassId) {
      const classData = await classRepository.findById(resolvedClassId);
      if (!classData) {
        throw new AppError('La clase no existe', 404);
      }
      if (!resolvedStudentId) {
        resolvedStudentId = classData.student_id;
      }
    }
    if (resolvedStudentId) {
      const student = await userRepository.findById(resolvedStudentId);
      if (!student || student.role !== 'student') {
        throw new AppError('El alumno no existe', 404);
      }
    }
    return { studentId: resolvedStudentId, classId: resolvedClassId };
  }

  if (resolvedClassId) {
    const classData = await validateClassForTeacher(resolvedClassId, user.id);
    if (!resolvedStudentId) {
      resolvedStudentId = classData.student_id;
    } else if (resolvedStudentId !== classData.student_id) {
      throw new AppError('El alumno no coincide con el alumno de la clase', 400);
    }
  }

  if (resolvedStudentId) {
    await validateStudentForTeacher(resolvedStudentId, user.id);
  }

  return { studentId: resolvedStudentId, classId: resolvedClassId };
}

async function getAssignmentWithAccess(id, user) {
  const assignment = await assignmentRepository.findById(id);
  if (!assignment) {
    throw new AppError('Tarea no encontrada', 404);
  }
  if (!canAccessAssignment(assignment, user)) {
    throw new AppError('No tienes permisos para acceder a esta tarea', 403);
  }
  return assignment;
}

async function createAssignment(user, { title, description, studentId, classId, dueDate }) {
  if (!title || !title.trim()) {
    throw new AppError('El título es obligatorio', 400);
  }

  const { studentId: resolvedStudentId, classId: resolvedClassId } =
    await resolveStudentAndClass(user, studentId, classId);

  const assignment = await assignmentRepository.create({
    teacherId: user.id,
    studentId: resolvedStudentId,
    classId: resolvedClassId,
    title: title.trim(),
    description: description ? description.trim() : null,
    dueDate: dueDate || null,
  });

  return assignment;
}

async function getMyAssignments(user) {
  return assignmentRepository.findByUser(user);
}

async function getAssignmentById(id, user) {
  return getAssignmentWithAccess(id, user);
}

async function updateAssignment(id, user, { title, description, dueDate, status }) {
  const assignment = await getAssignmentWithAccess(id, user);

  if (user.role === 'student') {
    throw new AppError('No tienes permisos para modificar esta tarea', 403);
  }

  if (user.role === 'teacher' && assignment.teacher_id !== user.id) {
    throw new AppError('No tienes permisos para modificar esta tarea', 403);
  }

  if (status && !VALID_STATUSES.includes(status)) {
    throw new AppError('El estado debe ser pending, submitted, reviewed o cancelled', 400);
  }

  const updatedAssignment = await assignmentRepository.update(id, {
    title: title !== undefined ? title.trim() : undefined,
    description: description !== undefined ? (description ? description.trim() : null) : undefined,
    dueDate: dueDate !== undefined ? dueDate : undefined,
    status,
  });

  return updatedAssignment;
}

async function submitAssignment(id, user, { submissionText, file }) {
  const assignment = await getAssignmentWithAccess(id, user);

  if (user.role !== 'student' || assignment.student_id !== user.id) {
    throw new AppError('Solo el alumno asignado puede entregar esta tarea', 403);
  }

  if (assignment.status === 'cancelled') {
    throw new AppError('No puedes entregar una tarea cancelada', 400);
  }

  if (assignment.status === 'reviewed') {
    throw new AppError('No puedes volver a entregar una tarea ya revisada', 400);
  }

  if (assignment.status !== 'pending') {
    throw new AppError('Solo puedes entregar tareas en estado pending', 400);
  }

  const trimmedText = submissionText ? submissionText.trim() : '';
  const hasText = trimmedText.length > 0;
  const hasFile = Boolean(file);

  if (!hasText && !hasFile) {
    throw new AppError('Debes enviar submission_text o un archivo', 400);
  }

  if (hasText && trimmedText.length > 5000) {
    throw new AppError('El texto de entrega no puede superar los 5000 caracteres', 400);
  }

  if (assignment.submission_file_path && file) {
    deleteFileIfExists(assignment.submission_file_path);
  }

  const updatedAssignment = await assignmentRepository.submit(id, {
    submissionText: hasText ? trimmedText : null,
    submissionFilePath: file ? file.path : assignment.submission_file_path,
    submissionOriginalFilename: file
      ? file.originalname
      : assignment.submission_original_filename,
  });

  return updatedAssignment;
}

async function reviewAssignment(id, user, { teacherFeedback }) {
  const assignment = await getAssignmentWithAccess(id, user);

  if (user.role === 'student') {
    throw new AppError('No tienes permisos para revisar esta tarea', 403);
  }

  if (user.role === 'teacher' && assignment.teacher_id !== user.id) {
    throw new AppError('No tienes permisos para revisar esta tarea', 403);
  }

  if (assignment.status !== 'submitted') {
    throw new AppError('Solo se pueden revisar tareas en estado submitted', 400);
  }

  if (teacherFeedback && teacherFeedback.trim().length > 2000) {
    throw new AppError('El feedback no puede superar los 2000 caracteres', 400);
  }

  const updatedAssignment = await assignmentRepository.review(id, {
    teacherFeedback: teacherFeedback ? teacherFeedback.trim() : null,
  });

  return updatedAssignment;
}

async function deleteAssignment(id, user) {
  const assignment = await getAssignmentWithAccess(id, user);

  if (user.role === 'student') {
    throw new AppError('No tienes permisos para eliminar esta tarea', 403);
  }

  if (user.role === 'teacher' && assignment.teacher_id !== user.id) {
    throw new AppError('No tienes permisos para eliminar esta tarea', 403);
  }

  const deleted = await assignmentRepository.deleteById(id);
  deleteFileIfExists(deleted.submission_file_path);

  return deleted;
}

async function getSubmissionFile(id, user) {
  const assignment = await getAssignmentWithAccess(id, user);

  if (!assignment.submission_file_path) {
    throw new AppError('Esta tarea no tiene archivo de entrega', 404);
  }

  return assignment;
}

module.exports = {
  createAssignment,
  getMyAssignments,
  getAssignmentById,
  updateAssignment,
  submitAssignment,
  reviewAssignment,
  deleteAssignment,
  getSubmissionFile,
};
