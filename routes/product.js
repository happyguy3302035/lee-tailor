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
// ==========================================
// GET /product/add - Render Add Form
// ==========================================
router.get('/add', (req, res) => {
  const sqlComponents = 'SELECT ComponentId, NameCHS, NameENG, NameShort FROM Component ORDER BY NameCHS ASC';
  
  db.all(sqlComponents, [], (err, availableComponents) => {
    if (err) console.error('Error fetching components:', err.message);
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
  const { Name, Code, Remark, componentIds } = req.body; // Adapt fields to match your Product schema

  const sqlProduct = 'INSERT INTO Product (Name, Code, Remark) VALUES (?, ?, ?)';
  const paramsProduct = [Name, Code, Remark];

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

    const stmt = db.prepare('INSERT INTO ProductComponent (ProductId, ComponentId, InvoiceManagementId) VALUES (?, ?, 0)');
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
      db.all('SELECT ComponentId, NameCHS, NameENG, NameShort FROM Component ORDER BY NameCHS ASC', [], (err, availableComponents) => {
        if (err) console.error('Error fetching available components:', err.message);

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
  const { Name, Code, Remark, componentIds } = req.body;

  let idsToInsert = [];
  if (Array.isArray(componentIds)) idsToInsert = componentIds;
  else if (componentIds) idsToInsert = [componentIds];

  const updateProductSql = 'UPDATE Product SET Name = ?, Code = ?, Remark = ? WHERE ProductId = ?';
  const paramsProduct = [Name, Code, Remark, productId];

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
        const stmt = db.prepare('INSERT INTO ProductComponent (ProductId, ComponentId, InvoiceManagementId) VALUES (?, ?, 0)');
        let insertedCount = 0;

        idsToInsert.forEach((compId) => {
          stmt.run([productId, compId], (err) => {
            if (err) console.error(`Error linking Component #${compId}:`, err.message);
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
