const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');
const studentRepository = require('../repositories/studentRepository');
const conversationRepository = require('../repositories/conversationRepository');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

async function createStudent(teacherId, { name, email, password }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new AppError('El email ya está registrado', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const student = await userRepository.createStudent({
    name,
    email,
    passwordHash,
    teacherId,
  });

  await conversationRepository.createIfNotExists(teacherId, student.id);

  return student;
}

async function getStudentsByTeacher(teacherId) {
  return userRepository.findStudentsByTeacherId(teacherId);
}

async function getStudentById(teacherId, studentId) {
  const student = await userRepository.findStudentByIdForTeacher(studentId, teacherId);
  if (!student) {
    throw new AppError('Alumno no encontrado o no pertenece a este profesor', 404);
  }
  return student;
}

async function updateStudentStatus(teacherId, studentId, isActive) {
  if (typeof isActive !== 'boolean') {
    throw new AppError('is_active debe ser un valor booleano', 400);
  }

  const student = await studentRepository.updateStatus(studentId, teacherId, isActive);
  if (!student) {
    throw new AppError('Alumno no encontrado o no pertenece a este profesor', 404);
  }

  return student;
}

module.exports = {
  createStudent,
  getStudentsByTeacher,
  getStudentById,
  updateStudentStatus,
};
