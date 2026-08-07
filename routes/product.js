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
  const { NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark, ComponentIds } = req.body;

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
  console.log('=== [DEBUG UPDATE PRODUCT] Raw req.body ===');
  console.log(req.body);
  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error creating product:', err.message);
      return res.redirect('/product/add?error=' + encodeURIComponent('Database error while creating product.'));
    }

    const newProductId = this.lastID;
    let idsToInsert = Array.isArray(ComponentIds) ? ComponentIds : ComponentIds ? [ComponentIds] : [];
    // ------------------------------------------------------------------
    // LOG 2: Check raw component IDs before normalization
    // ------------------------------------------------------------------
    console.log('=== [DEBUG UPDATE PRODUCT] Raw Component IDs ===', ComponentIds);
    console.log('Type of Raw Component IDs:', typeof ComponentIds);
    if (idsToInsert.length === 0) {
      return res.redirect('/product?message=created');
    }

    const stmt = db.prepare('INSERT INTO ProductComponent (ProductId, ComponentId) VALUES (?, ?)');
    let inserted = 0;

    idsToInsert.forEach((compId) => {
      console.log(`[DEBUG] Inserting ProductComponent -> ProductId: ${newProductId}, ComponentId: ${compId}`);
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

  console.log(`\n=== [DEBUG EDIT GET] Opening Edit Page for Product ID: ${productId} ===`);

  // Query 1: Fetch Product
  db.get('SELECT * FROM Product WHERE ProductId = ?', [productId], (err, product) => {
    if (err) {
      console.error('[DEBUG EDIT GET] Error fetching product:', err);
      return res.redirect('/product?error=' + encodeURIComponent('Database error.'));
    }
    if (!product) {
      console.warn(`[DEBUG EDIT GET] Product with ID ${productId} not found in DB.`);
      return res.redirect('/product?error=' + encodeURIComponent('Product not found.'));
    }

    console.log('[DEBUG EDIT GET] Product Found:', product.NameCHS || product.NameShort);

    // Query 2: Fetch all components
    db.all('SELECT * FROM Component ORDER BY NameCHS ASC', [], (err, components) => {
      if (err) {
        console.error('[DEBUG EDIT GET] Error fetching components:', err);
        components = [];
      }

      console.log(`[DEBUG EDIT GET] Total Components Available in DB: ${components ? components.length : 0}`);
      if (components && components.length > 0) {
        console.log('[DEBUG EDIT GET] Sample Component structure:', components[0]);
      }

      // Query 3: Fetch linked component IDs for this product
      db.all('SELECT ComponentId FROM ProductComponent WHERE ProductId = ?', [productId], (err, linkages) => {
        if (err) {
          console.error('[DEBUG EDIT GET] Error fetching product components:', err);
        }

        console.log('[DEBUG EDIT GET] Raw ProductComponent Linkages from DB:', linkages);

        // Map linkages to array of IDs
        const selectedComponentIds = (linkages || []).map((l) => l.ComponentId);

        console.log('[DEBUG EDIT GET] Mapped selectedComponentIds:', selectedComponentIds);
        console.log('[DEBUG EDIT GET] Data types of selectedComponentIds:', selectedComponentIds.map(id => typeof id));

        // Render page
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
  const { NameShort, NameCHS, NameENG, Priority, ReportPriority, Remark, ComponentIds } = req.body;

  if (!NameShort?.trim() || !NameCHS?.trim() || !NameENG?.trim()) {
    return res.redirect(`/product/edit/${productId}?error=` + encodeURIComponent('Short Name, Chinese Name, and English Name are required.'));
  }

  let idsToInsert = Array.isArray(ComponentIds) ? ComponentIds : ComponentIds ? [ComponentIds] : [];

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
