const express = require('express');
const router = express.Router();
const db = require('../database');

// 1. READ: Get all products
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM Product ORDER BY Priority ASC, ProductId DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching products:', err.message);
      return res.status(500).send('Database error');
    }

    res.render('product', {
      products: rows || [],
      message: req.query.msg || null,
      error: req.query.err || null,
      activePage: 'product'
    });
  });
});

// 2. CREATE: Add a new product
router.post('/add', (req, res) => {
  const { NameCHS, NameENG, NameShort, Remark, ReportPriority, Priority } = req.body;

  if (!NameCHS || !NameENG || !NameShort) {
    return res.redirect('/product?err=' + encodeURIComponent('Chinese Name, English Name, and Short Name are required.'));
  }

  const priorityVal = Priority !== '' && Priority !== undefined ? parseInt(Priority, 10) : null;
  const reportPriorityVal = ReportPriority !== '' && ReportPriority !== undefined ? parseInt(ReportPriority, 10) : null;

  const sql = `
    INSERT INTO Product (NameCHS, NameENG, NameShort, Remark, ReportPriority, Priority) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    NameCHS.trim(), 
    NameENG.trim(), 
    NameShort.trim(), 
    Remark ? Remark.trim() : null, 
    reportPriorityVal, 
    priorityVal
  ], function(err) {
    if (err) {
      console.error('Error creating Product:', err.message);
      let errMsg = 'Failed to create product.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A product with that Chinese Name, English Name, or Short Name already exists.';
      }
      return res.redirect('/product?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/product?msg=created');
  });
});

// 3. UPDATE: Edit existing product
router.post('/update', (req, res) => {
  const { ProductId, NameCHS, NameENG, NameShort, Remark, ReportPriority, Priority } = req.body;

  if (!ProductId || !NameCHS || !NameENG || !NameShort) {
    return res.redirect('/product?err=' + encodeURIComponent('Missing required fields.'));
  }

  const priorityVal = Priority !== '' && Priority !== undefined ? parseInt(Priority, 10) : null;
  const reportPriorityVal = ReportPriority !== '' && ReportPriority !== undefined ? parseInt(ReportPriority, 10) : null;

  const sql = `
    UPDATE Product 
    SET NameCHS = ?, NameENG = ?, NameShort = ?, Remark = ?, ReportPriority = ?, Priority = ?
    WHERE ProductId = ?
  `;

  db.run(sql, [
    NameCHS.trim(), 
    NameENG.trim(), 
    NameShort.trim(), 
    Remark ? Remark.trim() : null, 
    reportPriorityVal, 
    priorityVal, 
    ProductId
  ], function(err) {
    if (err) {
      console.error('Error updating Product:', err.message);
      let errMsg = 'Failed to update product.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A product with that Chinese Name, English Name, or Short Name already exists.';
      }
      return res.redirect('/product?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/product?msg=updated');
  });
});

// 4. DELETE: Remove a product
router.post('/delete/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Product WHERE ProductId = ?';

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting Product:', err.message);
      return res.redirect('/product?err=' + encodeURIComponent('Failed to delete product.'));
    }
    res.redirect('/product?msg=deleted');
  });
});

module.exports = router;
