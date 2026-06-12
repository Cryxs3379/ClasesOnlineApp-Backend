const teacherRepository = require('../repositories/teacherRepository');
const AppError = require('../utils/AppError');

async function createOrUpdateProfile(teacherId, { bio, hourlyRate, subject, avatarUrl }) {
  const existingProfile = await teacherRepository.findByTeacherId(teacherId);

  if (existingProfile) {
    const updatedProfile = await teacherRepository.update({
      teacherId,
      bio,
      hourlyRate,
      subject,
      avatarUrl,
    });
    return updatedProfile;
  }

  const newProfile = await teacherRepository.create({
    teacherId,
    bio,
    hourlyRate,
    subject,
    avatarUrl,
  });
  return newProfile;
}

async function getAllTeachers() {
  return teacherRepository.findAll();
}

async function getTeacherById(id) {
  const teacher = await teacherRepository.findById(id);
  if (!teacher) {
    throw new AppError('Perfil de profesor no encontrado', 404);
  }
  return teacher;
}

async function validateTeacherExists(teacherId) {
  const teacher = await teacherRepository.findUserById(teacherId);
  if (!teacher) {
    throw new AppError('Profesor no encontrado', 404);
  }
  if (teacher.role !== 'teacher') {
    throw new AppError('El usuario indicado no es un profesor', 400);
  }
  if (!teacher.is_active) {
    throw new AppError('El profesor no está activo', 400);
  }
  return teacher;
}

module.exports = {
  createOrUpdateProfile,
  getAllTeachers,
  getTeacherById,
  validateTeacherExists,
};
