const classRepository = require('../repositories/classRepository');
const teacherService = require('./teacherService');
const generateJitsiRoom = require('../utils/generateJitsiRoom');
const AppError = require('../utils/AppError');

function validateClassTimes(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Las fechas de inicio y fin no son válidas', 400);
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

async function createClass(studentId, { teacherId, startTime, endTime }) {
  validateClassTimes(startTime, endTime);
  await teacherService.validateTeacherExists(teacherId);

  if (studentId === teacherId) {
    throw new AppError('No puedes reservar una clase contigo mismo', 400);
  }

  const jitsiRoomName = generateJitsiRoom();

  const newClass = await classRepository.create({
    studentId,
    teacherId,
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
  return classRepository.findByUserId(user.id);
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

module.exports = {
  createClass,
  getMyClasses,
  getClassById,
};
