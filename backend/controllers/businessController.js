const businessService = require('../services/businessService');

const listBusinesses = async (req, res, next) => {
  try {
    const businesses = await businessService.listBusinesses(req.query);
    res.json({ status: 'success', data: businesses });
  } catch (error) {
    next(error);
  }
};

const updateBusiness = async (req, res, next) => {
  try {
    await businessService.updateBusiness(req.params.id, {
      ...req.body,
      updatedBy: req.user.id
    });
    res.json({ status: 'success', message: 'Berhasil memperbarui prospek' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listBusinesses,
  updateBusiness
};
