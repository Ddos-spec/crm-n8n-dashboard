const { validationResult } = require('express-validator');
const createError = require('http-errors');

const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(createError(422, 'Validasi gagal', { details: errors.array() }));
  }
  return next();
};

module.exports = validate;
