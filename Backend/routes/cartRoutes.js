const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

router.get('/', auth, cartController.getCart);
router.post('/', auth, cartController.addToCart);
router.delete('/:itemId', auth, cartController.removeFromCart);

module.exports = router;