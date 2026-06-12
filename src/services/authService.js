const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';
const PUBLIC_REGISTER_ROLES = ['teacher', 'admin'];

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      teacher_id: user.teacher_id || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function register({ name, email, password, role }) {
  if (!PUBLIC_REGISTER_ROLES.includes(role)) {
    throw new AppError('El rol debe ser teacher o admin', 400);
  }

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw new AppError('El email ya está registrado', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user =
    role === 'admin'
      ? await userRepository.createAdmin({ name, email, passwordHash })
      : await userRepository.createTeacher({ name, email, passwordHash });

  const token = generateToken(user);

  return { user, token };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError('Credenciales inválidas', 401);
  }

  if (!user.is_active) {
    throw new AppError('Tu cuenta está desactivada. Contacta con tu profesor o administrador', 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Credenciales inválidas', 401);
  }

  const { password_hash, ...userWithoutPassword } = user;
  const token = generateToken(userWithoutPassword);

  return { user: userWithoutPassword, token };
}

async function getMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return user;
}

module.exports = {
  register,
  login,
  getMe,
};
