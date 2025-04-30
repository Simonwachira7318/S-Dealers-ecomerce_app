const { pool } = require('../config/db');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    let query = 'SELECT p.*, c.name as category_name, c.is_age_restricted FROM products p JOIN categories c ON p.category_id = c.id';
    const params = [];
    
    if (req.query.category) {
      query += ' WHERE c.slug = ?';
      params.push(req.query.category);
    }
    
    if (req.query.ageVerified !== 'true') {
      query += params.length ? ' AND c.is_age_restricted = FALSE' : ' WHERE c.is_age_restricted = FALSE';
    }
    
    if (req.query.sort) {
      const sortOptions = {
        'date': 'p.created_at DESC',
        'price-asc': 'p.price ASC',
        'price-desc': 'p.price DESC',
        'name-asc': 'p.name ASC',
        'name-desc': 'p.name DESC'
      };
      
      if (sortOptions[req.query.sort]) {
        query += ` ORDER BY ${sortOptions[req.query.sort]}`;
      }
    }
    
    const [products] = await pool.query(query, params);
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search products
const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    let searchQuery = `
      SELECT p.*, c.name as category_name, c.is_age_restricted 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.name LIKE ? OR p.description LIKE ?
    `;
    
    const searchParams = [`%${query}%`, `%${query}%`];
    
    if (req.query.ageVerified !== 'true') {
      searchQuery += ' AND c.is_age_restricted = FALSE';
    }
    
    const [products] = await pool.query(searchQuery, searchParams);
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, c.is_age_restricted 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = products[0];
    
    if (product.is_age_restricted && req.query.ageVerified !== 'true') {
      return res.status(403).json({ message: 'Age verification required for this product' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllProducts, searchProducts, getProductById };