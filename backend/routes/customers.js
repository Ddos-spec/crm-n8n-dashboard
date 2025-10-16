const express = require('express');
const customerController = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', authorize('admin', 'manager'), customerController.createCustomer);
router.put('/:id', authorize('admin', 'manager', 'operator'), customerController.updateCustomer);

module.exports = router;
