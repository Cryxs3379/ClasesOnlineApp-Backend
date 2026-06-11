const { validationResult } = require('express-validator');
const classService = require('../services/classService');
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

async function createClass(req, res, next) {
  try {
    handleValidationErrors(req);
    const { teacher_id, start_time, end_time } = req.body;

    const newClass = await classService.createClass(req.user.id, {
      teacherId: teacher_id,
      startTime: start_time,
      endTime: end_time,
    });

    res.status(201).json({
      success: true,
      message: 'Clase reservada correctamente',
      data: { class: newClass },
    });
  } catch (error) {
    next(error);
  }
}

async function getMyClasses(req, res, next) {
  try {
    const classes = await classService.getMyClasses(req.user);

    res.status(200).json({
      success: true,
      data: { classes },
    });
  } catch (error) {
    next(error);
  }
}

async function getClassById(req, res, next) {
  try {
    const classData = await classService.getClassById(req.params.id, req.user);

    res.status(200).json({
      success: true,
      data: { class: classData },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createClass,
  getMyClasses,
  getClassById,
};
