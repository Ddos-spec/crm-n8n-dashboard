const { body } = require('express-validator');

const loginValidator = [
  body('email').isEmail().withMessage('Email tidak valid'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter')
];

module.exports = {
  loginValidator
};
