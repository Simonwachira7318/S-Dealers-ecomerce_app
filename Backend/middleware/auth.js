const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({ message: 'Account blocked' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const admin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const ageVerification = (req, res, next) => {
  if (!req.headers['age-verified']) {
    return res.status(403).json({ message: 'Age verification required' });
  }
  next();
};

module.exports = { auth, admin, ageVerification };