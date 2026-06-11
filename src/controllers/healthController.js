const healthService = require('../services/healthService');

async function checkDatabase(req, res, next) {
  try {
    const databaseTime = await healthService.checkDatabaseConnection();

    res.status(200).json({
      success: true,
      message: 'Conexión con PostgreSQL funcionando',
      databaseTime,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkDatabase,
};
