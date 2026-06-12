const { validationResult } = require('express-validator');
const teacherService = require('../services/teacherService');
const AppError = require('../utils/AppError');

function handleValidationErrors(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((err) => err.msg)
      .join('. ');
    throw new AppError(message, 400);
  }
}

async function createOrUpdateProfile(req, res, next) {
  try {
    handleValidationErrors(req);
    const { bio, subject, avatar_url } = req.body;
    const hourly_rate = req.body.hourly_rate ?? req.body.hourly_price;

    const profile = await teacherService.createOrUpdateProfile(req.user.id, {
      bio,
      hourlyRate: hourly_rate,
      subject,
      avatarUrl: avatar_url,
    });

    res.status(200).json({
      success: true,
      message: 'Perfil de profesor guardado correctamente',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}

async function getAllTeachers(req, res, next) {
  try {
    const teachers = await teacherService.getAllTeachers();

    res.status(200).json({
      success: true,
      data: { teachers },
    });
  } catch (error) {
    next(error);
  }
}

async function getTeacherById(req, res, next) {
  try {
    const teacher = await teacherService.getTeacherById(req.params.id);

    res.status(200).json({
      success: true,
      data: { teacher },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrUpdateProfile,
  getAllTeachers,
  getTeacherById,
};
