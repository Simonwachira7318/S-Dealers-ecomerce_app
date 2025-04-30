const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Add your user routes here
// Example:
// router.get('/profile', auth, userController.getProfile);

module.exports = router;