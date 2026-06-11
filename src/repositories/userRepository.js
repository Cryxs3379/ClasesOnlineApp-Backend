const pool = require('../config/db');

async function findByEmail(email) {
  const query = `
    SELECT id, name, email, password_hash, role, created_at
    FROM users
    WHERE email = $1
  `;
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const query = `
    SELECT id, name, email, role, created_at
    FROM users
    WHERE id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash, role }) {
  const query = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role, created_at
  `;
  const { rows } = await pool.query(query, [name, email, passwordHash, role]);
  return rows[0];
}

module.exports = {
  findByEmail,
  findById,
  create,
};
