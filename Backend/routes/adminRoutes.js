const express = require('express');
const router = express.Router();
const { auth, admin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.get('/users', auth, admin, adminController.getUsers);
router.put('/users/:userId/block', auth, admin, adminController.toggleBlockUser);
router.put('/orders/:orderId/status', auth, admin, adminController.updateOrderStatus);

module.exports = router;