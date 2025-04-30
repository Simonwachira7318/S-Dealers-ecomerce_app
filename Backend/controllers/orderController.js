const db = require('../config/db');

// Create order from cart
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.body;
    
    // Get user's cart
    const [carts] = await db.query('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (carts.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    
    const cartId = carts[0].id;
    
    // Get cart items
    const [cartItems] = await db.query(`
      SELECT ci.product_id, ci.quantity, p.price 
      FROM cart_items ci 
      JOIN products p ON ci.product_id = p.id 
      WHERE ci.cart_id = ?
    `, [cartId]);
    
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    
    // Calculate total
    let total = 0;
    cartItems.forEach(item => {
      total += item.price * item.quantity;
    });
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Create order
      const [orderResult] = await db.query(
        'INSERT INTO orders (user_id, total_amount, address_id) VALUES (?, ?, ?)',
        [userId, total, addressId]
      );
      
      const orderId = orderResult.insertId;
      
      // Add order items
      for (const item of cartItems) {
        await db.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price]
        );
        
        // Update product stock
        await db.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      
      // Clear cart
      await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
      
      await db.query('COMMIT');
      
      res.status(201).json({ message: 'Order created successfully', orderId });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's orders
const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [orders] = await db.query(`
      SELECT o.id, o.total_amount, o.status, o.created_at, o.updated_at, 
             a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country
      FROM orders o
      LEFT JOIN user_addresses a ON o.address_id = a.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);
    
    // Get order items for each order
    for (const order of orders) {
      const [items] = await db.query(`
        SELECT oi.quantity, oi.price, p.id as product_id, p.name, p.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);
      
      order.items = items;
    }
    
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createOrder, getOrders };