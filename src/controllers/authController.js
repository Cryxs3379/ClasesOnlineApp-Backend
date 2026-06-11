const { validationResult } = require('express-validator');
const authService = require('../services/authService');
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

async function register(req, res, next) {
  try {
    handleValidationErrors(req);
    const { name, email, password, role } = req.body;
    const result = await authService.register({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    handleValidationErrors(req);
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe,
};
