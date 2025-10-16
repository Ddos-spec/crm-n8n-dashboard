const bcrypt = require('bcryptjs');
const createError = require('http-errors');
const dashboardUserRepository = require('../repositories/dashboardUserRepository');
const { signToken } = require('../utils/jwt');

const login = async (email, password) => {
  const user = await dashboardUserRepository.findByEmail(email);
  if (!user) {
    throw createError(401, 'Email atau password salah');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw createError(401, 'Email atau password salah');
  }

  const token = signToken({ id: user.id, role: user.role, name: user.fullName });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    }
  };
};

const getProfile = async (id) => {
  const user = await dashboardUserRepository.findById(id);
  if (!user) {
    throw createError(404, 'Pengguna tidak ditemukan');
  }
  return user;
};

module.exports = {
  login,
  getProfile
};
