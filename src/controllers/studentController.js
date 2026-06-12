const { validationResult } = require('express-validator');
const studentService = require('../services/studentService');
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

async function createStudent(req, res, next) {
  try {
    handleValidationErrors(req);
    const { name, email, password } = req.body;

    const student = await studentService.createStudent(req.user.id, {
      name,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      message: 'Alumno creado correctamente',
      data: { student },
    });
  } catch (error) {
    next(error);
  }
}

async function getStudents(req, res, next) {
  try {
    const students = await studentService.getStudentsByTeacher(req.user.id);

    res.status(200).json({
      success: true,
      data: { students },
    });
  } catch (error) {
    next(error);
  }
}

async function getStudentById(req, res, next) {
  try {
    const student = await studentService.getStudentById(req.user.id, req.params.id);

    res.status(200).json({
      success: true,
      data: { student },
    });
  } catch (error) {
    next(error);
  }
}

async function updateStudentStatus(req, res, next) {
  try {
    handleValidationErrors(req);
    const { is_active } = req.body;

    const student = await studentService.updateStudentStatus(
      req.user.id,
      req.params.id,
      is_active
    );

    res.status(200).json({
      success: true,
      message: 'Estado del alumno actualizado correctamente',
      data: { student },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudentStatus,
};
