const express = require('express');
const router = express.Router();
const db = require('../database');

// ==========================================
// 1. LIST: GET /product
// ==========================================
router.get('/', (req, res) => {
  const sql = `
    SELECT p.*, c.ComponentId, c.NameCHS AS CompNameCHS
    FROM Product p
    LEFT JOIN ProductComponent pc ON p.ProductId = pc.ProductId
    LEFT JOIN Component c ON pc.ComponentId = c.ComponentId
    ORDER BY p.Priority ASC, p.ProductId DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching products:', err.message);
      return res.status(500).send('Database error');
    }

    // Group rows by ProductId
    const productsMap = {};
    (rows || []).forEach((row) => {
      if (!productsMap[row.ProductId]) {
        productsMap[row.ProductId] = {
          ProductId: row.ProductId,
          NameShort: row.NameShort,
          NameCHS: row.NameCHS,
          NameENG: row.NameENG,
          Priority: row.Priority,
          ReportPriority: row.ReportPriority,
          Remark: row.Remark,
          Components: []
        };
      }
      if (row.ComponentId) {
        productsMap[row.ProductId].Components.push({
          ComponentId: row.ComponentId,
          NameCHS: row.CompNameCHS
        });
      }
    });

    res.render('product', {
      products: Object.values(productsMap),
      message: req.query.message || null,
      error: req.query.error || null,
      activePage: 'product'
    });
  });
});

// ==========================================
// 2. ADD FORM: GET /product/add
// ==========================================
router.get('/add', (req, res) => {
  // Lazily fetch available components ONLY for the add page
  db.all('SELECT * FROM Component ORDER BY NameCHS ASC', [], (err, components) => {
    if (err) {
      console.error('Error fetching components:', err.message);
      components = [];
    }

    res.render('product-add', {
      components: components || [],
      error: req.query.error || null,
      formData: {},
      activePage: 'product'
    });
  });
});

// ==========================================
// 3. PROCESS ADD: POST /product/add
// ==========================================
router.post('/add', (req, res) => {
  const { NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark, componentIds } = req.body;

  if (!NameShort?.trim() || !NameCHS?.trim() || !NameENG?.trim()) {
    return res.redirect('/product/add?error=' + encodeURIComponent('Short Name, Chinese Name, and English Name are required.'));
  }

  const sql = `
    INSERT INTO Product (NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [
    NameShort.trim(),
    NameCHS.trim(),
    NameENG.trim(),
    Priority ? parseInt(Priority, 10) : null,
    ReportPriority ? parseInt(ReportPriority, 10) : null,
    Remark ? Remark.trim() : null
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error creating product:', err.message);
      return res.redirect('/product/add?error=' + encodeURIComponent('Database error while creating product.'));
    }

    const newProductId = this.lastID;
    let idsToInsert = Array.isArray(componentIds) ? componentIds : componentIds ? [componentIds] : [];

    if (idsToInsert.length === 0) {
      return res.redirect('/product?message=created');
    }

    const stmt = db.prepare('INSERT INTO ProductComponent (ProductId, ComponentId) VALUES (?, ?)');
    let inserted = 0;

    idsToInsert.forEach((compId) => {
      stmt.run([newProductId, compId], (err) => {
        if (err) console.error(`Error linking Component #${compId}:`, err.message);
        inserted++;
        if (inserted === idsToInsert.length) {
          stmt.finalize();
          res.redirect('/product?message=created');
        }
      });
    });
  });
});

// ==========================================
// 4. EDIT FORM: GET /product/edit/:id
// ==========================================
router.get('/edit/:id', (req, res) => {
  const productId = req.params.id;

  // Query 1: Fetch Product
  db.get('SELECT * FROM Product WHERE ProductId = ?', [productId], (err, product) => {
    if (err || !product) {
      return res.redirect('/product?error=' + encodeURIComponent('Product not found.'));
    }

    // Query 2: Fetch all components
    db.all('SELECT * FROM Component ORDER BY NameCHS ASC', [], (err, components) => {
      if (err) components = [];

      // Query 3: Fetch linked component IDs for this product
      db.all('SELECT ComponentId FROM ProductComponent WHERE ProductId = ?', [productId], (err, linkages) => {
        const selectedComponentIds = (linkages || []).map((l) => l.ComponentId);

        res.render('product-edit', {
          product,
          components: components || [],
          selectedComponentIds,
          error: req.query.error || null,
          activePage: 'product'
        });
      });
    });
  });
});

// ==========================================
// 5. PROCESS EDIT: POST /product/edit/:id
// ==========================================
router.post('/edit/:id', (req, res) => {
  const productId = req.params.id;
  const { NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark, componentIds } = req.body;

  if (!NameShort?.trim() || !NameCHS?.trim() || !NameENG?.trim()) {
    return res.redirect(`/product/edit/${productId}?error=` + encodeURIComponent('Short Name, Chinese Name, and English Name are required.'));
  }

  let idsToInsert = Array.isArray(componentIds) ? componentIds : componentIds ? [componentIds] : [];

  const updateSql = `
    UPDATE Product SET
      NameShort = ?, NameCHS = ?, NameENG = ?, Priority = ?, ReportPriority = ?, Remark = ?
    WHERE ProductId = ?
  `;

  const params = [
    NameShort.trim(),
    NameCHS.trim(),
    NameENG.trim(),
    Priority ? parseInt(Priority, 10) : null,
    ReportPriority ? parseInt(ReportPriority, 10) : null,
    Remark ? Remark.trim() : null,
    productId
  ];

  db.serialize(() => {
    db.run(updateSql, params, (err) => {
      if (err) {
        return res.redirect(`/product/edit/${productId}?error=` + encodeURIComponent('Failed to update product.'));
      }

      db.run('DELETE FROM ProductComponent WHERE ProductId = ?', [productId], (err) => {
        if (err) {
          return res.redirect(`/product/edit/${productId}?error=` + encodeURIComponent('Failed to update linkages.'));
        }

        if (idsToInsert.length === 0) {
          return res.redirect('/product?message=updated');
        }

        const stmt = db.prepare('INSERT INTO ProductComponent (ProductId, ComponentId) VALUES (?, ?)');
        let inserted = 0;

        idsToInsert.forEach((compId) => {
          stmt.run([productId, compId], (err) => {
            if (err) console.error(`Error linking Component #${compId}:`, err.message);
            inserted++;
            if (inserted === idsToInsert.length) {
              stmt.finalize();
              res.redirect('/product?message=updated');
            }
          });
        });
      });
    });
  });
});

// ==========================================
// 6. DELETE CONFIRMATION: GET /product/delete/:id
// ==========================================
router.get('/delete/:id', (req, res) => {
  const productId = req.params.id;

  db.get('SELECT * FROM Product WHERE ProductId = ?', [productId], (err, product) => {
    if (err || !product) {
      return res.redirect('/product?error=' + encodeURIComponent('Product not found.'));
    }

    res.render('product-delete', {
      product,
      activePage: 'product'
    });
  });
});

// ==========================================
// 7. PROCESS DELETE: POST /product/delete/:id
// ==========================================
router.post('/delete/:id', (req, res) => {
  const productId = req.params.id;

  db.serialize(() => {
    db.run('DELETE FROM ProductComponent WHERE ProductId = ?', [productId], (err) => {
      if (err) {
        return res.redirect('/product?error=' + encodeURIComponent('Failed to delete component links.'));
      }

      db.run('DELETE FROM Product WHERE ProductId = ?', [productId], (err) => {
        if (err) {
          return res.redirect('/product?error=' + encodeURIComponent('Failed to delete product.'));
        }

        res.redirect('/product?message=deleted');
      });
    });
  });
});

module.exports = router;
