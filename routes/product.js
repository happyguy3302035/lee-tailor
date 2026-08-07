const express = require('express');
const router = express.Router();
const db = require('../database');
const { getCachedComponents } = require('./component'); // Destructuring still works!

// ==========================================
// 1. READ: List Product Records
// GET /product
// ==========================================
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

// ==========================================
// 2. CREATE: Add a new product
// GET /product/add - Render Add Form
// ==========================================
router.get('/add', (req, res) => {
  getCachedComponents((err, orderCodes) => {
    if (err) {
      console.error('Error fetching order codes:', err.message);
      orderCodes = [];
    }
    res.render('product-add', {
      availableComponents: availableComponents || [],
      activePage: 'product'
    });
  });
});

// ==========================================
// POST /product/add - Save New Product & Linkages
// ==========================================
router.post('/add', (req, res) => {
  const { NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark, componentIds } = req.body;
// Adapt fields to match your Product schema

  const sqlProduct = 'INSERT INTO Product (NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark) VALUES (?, ?, ?, ?, ?, ?)';
  const paramsProduct = [NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark];

  db.run(sqlProduct, paramsProduct, function(err) {
    if (err) {
      console.error('Error creating product:', err.message);
      return res.redirect('/product?err=' + encodeURIComponent('Failed to create product.'));
    }

    const newProductId = this.lastID;

    // Normalize componentIds array
    let idsToInsert = [];
    if (Array.isArray(componentIds)) idsToInsert = componentIds;
    else if (componentIds) idsToInsert = [componentIds];

    if (idsToInsert.length === 0) {
      return res.redirect('/product?msg=created');
    }

    const stmt = db.prepare('INSERT INTO ProductComponent (ProductId, ComponentId) VALUES (?, ?)');
    let insertedCount = 0;

    idsToInsert.forEach((compId) => {
      stmt.run([newProductId, compId], (err) => {
        if (err) console.error(`Error linking Component #${compId}:`, err.message);
        insertedCount++;
        if (insertedCount === idsToInsert.length) {
          stmt.finalize();
          res.redirect('/product?msg=created');
        }
      });
    });
  });
});

// 3. UPDATE: Edit existing product
// ==========================================
// GET /product/edit/:id - Render Edit Form
// ==========================================
router.get('/edit/:id', (req, res) => {
  const productId = req.params.id;

  db.get('SELECT * FROM Product WHERE ProductId = ?', [productId], (err, product) => {
    if (err || !product) return res.status(404).send('Product not found');

    // Fetch existing linked components
    const linkedSql = `
      SELECT pc.ProductComponentId, pc.ComponentId, c.NameCHS, c.NameENG, c.NameShort
      FROM ProductComponent pc
      JOIN Component c ON pc.ComponentId = c.ComponentId
      WHERE pc.ProductId = ?
    `;

    db.all(linkedSql, [productId], (err, linkedComponents) => {
      if (err) console.error('Error fetching linked components:', err.message);

      // Fetch all available components for dropdown selection
      getCachedComponents((err, availableComponents) => {
        if (err) {
          console.error('Error fetching available order codes:', err.message);
        }
        res.render('product-edit', {
          product,
          linkedComponents: linkedComponents || [],
          availableComponents: availableComponents || [],
          activePage: 'product'
        });
      });
    });
  });
});

// ==========================================
// POST /product/edit/:id - Update Product & Linkages
// ==========================================
router.post('/edit/:id', (req, res) => {
  const productId = req.params.id;
  const { NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark, componentIds } = req.body;

  let idsToInsert = [];
  if (Array.isArray(componentIds)) idsToInsert = componentIds;
  else if (componentIds) idsToInsert = [componentIds];

  const updateProductSql = 'UPDATE Product SET NameShort = ?, NameCHS = ?, NameENG = ?, Priority = ?, ReportPriority = ?, Remark = ? WHERE ProductId = ?';
  const paramsProduct = [NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark, productId];

  db.serialize(() => {
    // 1. Update Product Details
    db.run(updateProductSql, paramsProduct, function(err) {
      if (err) {
        console.error('Error updating product:', err.message);
        return res.redirect('/product?err=' + encodeURIComponent('Failed to update product.'));
      }

      // 2. Clear Old Linkages
      db.run('DELETE FROM ProductComponent WHERE ProductId = ?', [productId], (err) => {
        if (err) {
          console.error('Error clearing old linkages:', err.message);
          return res.redirect('/product?err=' + encodeURIComponent('Failed to update components.'));
        }

        if (idsToInsert.length === 0) {
          return res.redirect('/product?msg=updated');
        }

        // 3. Re-insert Selected Components
        const stmt = db.prepare('INSERT INTO ProductComponent (ProductId, ComponentId) VALUES (?, ?)');
        let insertedCount = 0;

        idsToInsert.forEach((compId) => {
          stmt.run([productId, compId], (err) => {
            if (err) 
              console.error(`Error linking Component #${compId}:`, err.message);
            insertedCount++;
            if (insertedCount === idsToInsert.length) {
              stmt.finalize();
              res.redirect('/product?msg=updated');
            }
          });
        });
      });
    });
  });
});

// ==========================================
// 6. DELETE (Page): Render Delete Confirmation Screen
// GET /clientinfo/delete/:id
// ==========================================
router.get('/delete/:id', (req, res) => {
  const productId = req.params.id;

  db.get('SELECT * FROM Product WHERE ProductId = ?', [productId], (err, product) => {
    if (err || !product) {
      return res.status(404).send('Product not found');
    }

    res.render('product-delete', {
      client,
      activePage: 'product'
    });
  });
});

// ==========================================
// 4. DELETE: Remove a product
// POST /product/delete/:id
// ==========================================
router.post('/delete/:id', (req, res) => {
  const productId = req.params.id;
  // Step 1: Delete linked records in ProductComponent
  db.run('DELETE FROM ProductComponent WHERE ProductId = ?', [productId], (err) => {
    if (err) {
      console.error('Error clearing linkages:', err.message);
      return res.redirect('/product?err=' + encodeURIComponent('Failed to delete associated linkages.'));
    }
  });
  db.run('DELETE FROM Product WHERE ProductId = ?', [productId], function (err) {
    if (err) {
      console.error('Error deleting Product:', err.message);
      return res.redirect('/product?err=' + encodeURIComponent('Failed to delete product.'));
    }
    res.redirect('/product?msg=deleted');
  });
});

module.exports = router;
