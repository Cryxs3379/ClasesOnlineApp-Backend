const healthRepository = require('../repositories/healthRepository');
const AppError = require('../utils/AppError');

async function checkDatabaseConnection() {
  try {
    const databaseTime = await healthRepository.ping();
    return databaseTime;
  } catch (error) {
    throw new AppError('No se pudo conectar con PostgreSQL', 503);
  }
}

module.exports = {
  checkDatabaseConnection,
};
