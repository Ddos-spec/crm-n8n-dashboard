const customerService = require('../services/customerService');

const listCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.listCustomers(req.query);
    res.json({ status: 'success', data: customers });
  } catch (error) {
    next(error);
  }
};

const getCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomer(req.params.id);
    res.json({ status: 'success', data: customer });
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json({ status: 'success', data: customer });
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, {
      ...req.body,
      updatedBy: req.user.id
    });
    res.json({ status: 'success', data: customer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer
};
