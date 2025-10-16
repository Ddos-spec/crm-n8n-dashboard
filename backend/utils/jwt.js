const jwt = require('jsonwebtoken');

const signToken = (payload, expiresIn = '12h') =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = {
  signToken,
  verifyToken
};
