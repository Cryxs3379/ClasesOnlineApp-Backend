const teacherRepository = require('../repositories/teacherRepository');
const AppError = require('../utils/AppError');

async function createOrUpdateProfile(userId, { bio, hourlyPrice, subject }) {
  const existingProfile = await teacherRepository.findByUserId(userId);

  if (existingProfile) {
    const updatedProfile = await teacherRepository.update({
      userId,
      bio,
      hourlyPrice,
      subject,
    });
    return updatedProfile;
  }

  const newProfile = await teacherRepository.create({
    userId,
    bio,
    hourlyPrice,
    subject,
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
  return teacher;
}

module.exports = {
  createOrUpdateProfile,
  getAllTeachers,
  getTeacherById,
  validateTeacherExists,
};
