const pool = require('../config/db');

async function ping() {
  const query = 'SELECT NOW() AS database_time';
  const { rows } = await pool.query(query);
  return rows[0].database_time;
}

module.exports = {
  ping,
};
