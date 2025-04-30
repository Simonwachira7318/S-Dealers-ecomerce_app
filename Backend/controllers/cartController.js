const db = require('../config/db');

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get or create cart
    let [carts] = await db.query('SELECT id FROM carts WHERE user_id = ?', [userId]);
    
    let cartId;
    if (carts.length === 0) {
      const [result] = await db.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
      cartId = result.insertId;
    } else {
      cartId = carts[0].id;
    }
    
    // Get cart items with product details
    const [cartItems] = await db.query(`
      SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.image_url 
      FROM cart_items ci 
      JOIN products p ON ci.product_id = p.id 
      WHERE ci.cart_id = ?
    `, [cartId]);
    
    // Calculate total
    let total = 0;
    cartItems.forEach(item => {
      total += item.price * item.quantity;
    });
    
    res.status(200).json({ items: cartItems, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    
    // Validate input
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    
    // Check if product exists
    const [products] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get or create cart
    let [carts] = await db.query('SELECT id FROM carts WHERE user_id = ?', [userId]);
    
    let cartId;
    if (carts.length === 0) {
      const [result] = await db.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
      cartId = result.insertId;
    } else {
      cartId = carts[0].id;
    }
    
    // Check if item already in cart
    const [existingItems] = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cartId, productId]
    );
    
    if (existingItems.length > 0) {
      // Update quantity
      const newQuantity = existingItems[0].quantity + quantity;
      await db.query(
        'UPDATE cart_items SET quantity = ? WHERE id = ?',
        [newQuantity, existingItems[0].id]
      );
    } else {
      // Add new item
      await db.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
        [cartId, productId, quantity]
      );
    }
    
    res.status(200).json({ message: 'Item added to cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    
    // Get user's cart
    const [carts] = await db.query('SELECT id FROM carts WHERE user_id = ?', [userId]);
    if (carts.length === 0) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    const cartId = carts[0].id;
    
    // Delete item
    const [result] = await db.query(
      'DELETE FROM cart_items WHERE id = ? AND cart_id = ?',
      [itemId, cartId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }
    
    res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getCart, addToCart, removeFromCart };