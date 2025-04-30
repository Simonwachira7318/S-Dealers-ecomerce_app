const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const db = require('../config/db');
const { pool } = require('../config/db');
const { sendVerificationEmail } = require('../utils/verificationEmail');

// Register a new user
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;
    
    // Check if user exists
    const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate verification token
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (first_name, last_name, email, phone, password, verification_token) VALUES (?, ?, ?, ?, ?, ?)',
      [first_name, last_name, email, phone, hashedPassword, verificationToken]
    );
    
    // Send verification email
    await sendVerificationEmail(email, verificationToken);
    
    res.status(201).json({ message: 'User registered. Please check your email for verification.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Update user as verified
    const [result] = await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE email = ? AND verification_token = ?',
      [decoded.email, token]
    );
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check if user is verified
    if (!user.is_verified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }
    
    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({ token, user: { id: user.id, email: user.email, first_name: user.first_name, is_admin: user.is_admin } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, verifyEmail, login };