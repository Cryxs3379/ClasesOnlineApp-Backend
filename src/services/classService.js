const classRepository = require('../repositories/classRepository');
const userRepository = require('../repositories/userRepository');
const generateJitsiRoom = require('../utils/generateJitsiRoom');
const AppError = require('../utils/AppError');

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'missed'];

function validateClassTimes(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Las fechas de inicio y fin no son válidas', 400);
  }

  const now = new Date();

  if (start < now) {
    throw new AppError('No puedes reservar una clase en el pasado', 400);
  }

  if (end <= start) {
    throw new AppError('La hora de fin debe ser posterior a la hora de inicio', 400);
  }
}

function canAccessClass(classData, user) {
  if (user.role === 'admin') {
    return true;
  }
  return (
    classData.student_id === user.id || classData.teacher_id === user.id
  );
}

async function validateStudentBelongsToTeacher(studentId, teacherId) {
  const student = await userRepository.findStudentByIdForTeacher(studentId, teacherId);
  if (!student) {
    throw new AppError('El alumno no existe o no pertenece a este profesor', 404);
  }
  if (!student.is_active) {
    throw new AppError('El alumno no está activo', 400);
  }
  return student;
}

async function createClass(teacherId, { studentId, title, description, startTime, endTime }) {
  validateClassTimes(startTime, endTime);
  await validateStudentBelongsToTeacher(studentId, teacherId);

  const jitsiRoomName = generateJitsiRoom();

  const newClass = await classRepository.create({
    teacherId,
    studentId,
    title,
    description,
    startTime,
    endTime,
    jitsiRoomName,
  });

  return newClass;
}

async function getMyClasses(user) {
  if (user.role === 'admin') {
    return classRepository.findAll();
  }
  if (user.role === 'teacher') {
    return classRepository.findByTeacherId(user.id);
  }
  if (user.role === 'student') {
    return classRepository.findByStudentId(user.id);
  }
  return [];
}

async function getClassById(classId, user) {
  const classData = await classRepository.findById(classId);
  if (!classData) {
    throw new AppError('Clase no encontrada', 404);
  }

  if (!canAccessClass(classData, user)) {
    throw new AppError('No tienes permisos para ver esta clase', 403);
  }

  return classData;
}

async function updateClassStatus(teacherId, classId, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError(
      'El estado debe ser scheduled, completed, cancelled o missed',
      400
    );
  }

  const classData = await classRepository.findClassForTeacher(classId, teacherId);
  if (!classData) {
    throw new AppError('Clase no encontrada o no pertenece a este profesor', 404);
  }

  const updatedClass = await classRepository.updateStatus(classId, status);
  return updatedClass;
}

module.exports = {
  createClass,
  getMyClasses,
  getClassById,
  updateClassStatus,
};
