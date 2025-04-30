const db = require('../config/db');

// Get all users
const getUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, first_name, last_name, email, phone, is_verified, is_blocked, is_admin, created_at 
      FROM users
    `);
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Block/unblock user
const toggleBlockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { block } = req.body;
    
    await db.query(
      'UPDATE users SET is_blocked = ? WHERE id = ?',
      [block, userId]
    );
    
    res.status(200).json({ message: `User ${block ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'confirmed', 'in-transit', 'shipped'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const [result] = await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.status(200).json({ message: 'Order status updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getUsers, toggleBlockUser, updateOrderStatus };