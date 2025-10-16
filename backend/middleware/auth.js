const createError = require('http-errors');
const { verifyToken } = require('../utils/jwt');

const authenticate = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw createError(401, 'Token tidak ditemukan');
    }

    const [, token] = authHeader.split(' ');
    if (!token) {
      throw createError(401, 'Token tidak valid');
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(createError(401, 'Autentikasi gagal'));
  }
};

const authorize = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(createError(403, 'Akses ditolak'));
  }
  return next();
};

module.exports = {
  authenticate,
  authorize
};
