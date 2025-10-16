const authService = require('../services/authService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    res.json({ status: 'success', data: profile });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  me
};
