const AppError = require('../utils/AppError');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Usuario no autenticado', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('No tienes permisos para acceder a este recurso', 403)
      );
    }

    next();
  };
}

module.exports = requireRole;
