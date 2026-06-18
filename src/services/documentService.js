const documentRepository = require('../repositories/documentRepository');
const userRepository = require('../repositories/userRepository');
const classRepository = require('../repositories/classRepository');
const { deleteFileIfExists } = require('../utils/fileUtils');
const AppError = require('../utils/AppError');

function normalizeOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value;
}

function canDownloadDocument(document, user) {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'teacher') {
    return document.teacher_id === user.id;
  }

  if (user.role === 'student') {
    if (document.student_id === user.id) {
      return true;
    }

    return Boolean(document.class_id && document.class_student_id === user.id);
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

async function validateStudentForAdmin(studentId) {
  const student = await userRepository.findById(studentId);
  if (!student || student.role !== 'student') {
    throw new AppError('El alumno no existe', 404);
  }
  return student;
}

async function validateClassForAdmin(classId) {
  const classData = await classRepository.findById(classId);
  if (!classData) {
    throw new AppError('La clase no existe', 404);
  }
  return classData;
}

async function validateAssignmentTargets(user, studentId, classId) {
  if (user.role === 'admin') {
    if (studentId) {
      await validateStudentForAdmin(studentId);
    }
    if (classId) {
      await validateClassForAdmin(classId);
    }
    return;
  }

  if (studentId) {
    await validateStudentForTeacher(studentId, user.id);
  }

  if (classId) {
    await validateClassForTeacher(classId, user.id);
  }
}

async function uploadDocument(user, { title, description, studentId, classId, file }) {
  if (!title || !title.trim()) {
    throw new AppError('El título es obligatorio', 400);
  }

  const normalizedStudentId = normalizeOptionalId(studentId);
  const normalizedClassId = normalizeOptionalId(classId);

  if (!normalizedStudentId && !normalizedClassId) {
    throw new AppError('Debes indicar student_id o class_id', 400);
  }

  if (!file) {
    throw new AppError('El archivo es obligatorio', 400);
  }

  await validateAssignmentTargets(user, normalizedStudentId, normalizedClassId);

  const document = await documentRepository.create({
    teacherId: user.id,
    studentId: normalizedStudentId,
    classId: normalizedClassId,
    title: title.trim(),
    description: description ? description.trim() : null,
    originalFilename: file.originalname,
    storedFilename: file.filename,
    filePath: file.path,
    fileType: file.mimetype,
    fileSize: file.size,
  });

  return documentRepository.findById(document.id);
}

async function getMyDocuments(user) {
  if (user.role === 'admin') {
    return documentRepository.findAll();
  }

  if (user.role === 'teacher') {
    return documentRepository.findByTeacherId(user.id);
  }

  if (user.role === 'student') {
    return documentRepository.findByStudentId(user.id);
  }

  return [];
}

async function validateClassAccess(classId, user) {
  if (user.role === 'admin') {
    const classData = await classRepository.findById(classId);
    if (!classData) {
      throw new AppError('Clase no encontrada', 404);
    }
    return classData;
  }

  if (user.role === 'teacher') {
    return validateClassForTeacher(classId, user.id);
  }

  if (user.role === 'student') {
    const classData = await classRepository.findClassForStudent(classId, user.id);
    if (!classData) {
      throw new AppError('No tienes permisos para ver los documentos de esta clase', 403);
    }
    return classData;
  }

  throw new AppError('No tienes permisos para ver los documentos de esta clase', 403);
}

async function getClassDocuments(classId, user) {
  await validateClassAccess(classId, user);
  return documentRepository.findByClassId(classId);
}

async function getDocumentForDownload(documentId, user) {
  const document = await documentRepository.findById(documentId);
  if (!document) {
    throw new AppError('Documento no encontrado', 404);
  }

  const classData = document.class_id
    ? await classRepository.findById(document.class_id)
    : null;

  const documentWithClassStudent = {
    ...document,
    class_student_id: classData ? classData.student_id : null,
  };

  if (!canDownloadDocument(documentWithClassStudent, user)) {
    throw new AppError('No tienes permisos para descargar este documento', 403);
  }

  return document;
}

async function deleteDocument(documentId, user) {
  const document = await documentRepository.findById(documentId);
  if (!document) {
    throw new AppError('Documento no encontrado', 404);
  }

  if (user.role !== 'admin' && document.teacher_id !== user.id) {
    throw new AppError('No tienes permisos para borrar este documento', 403);
  }

  const deletedDocument = await documentRepository.deleteById(documentId);
  deleteFileIfExists(deletedDocument.file_path);

  return deletedDocument;
}

module.exports = {
  uploadDocument,
  getMyDocuments,
  getClassDocuments,
  getDocumentForDownload,
  deleteDocument,
};
