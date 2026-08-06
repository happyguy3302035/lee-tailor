const express = require('express');
const router = express.Router();
const db = require('../database');

// 1. READ: Get all components
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM Component ORDER BY Priority ASC, ComponentId DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching components:', err.message);
      return res.status(500).send('Database error');
    }

    res.render('component', {
      components: rows || [],
      message: req.query.msg || null,
      error: req.query.err || null,
      activePage: 'component'
    });
  });
});

// 2. CREATE: Add new component
router.post('/add', (req, res) => {
  const { NameCHS, NameENG, NameShort, Remark, Priority } = req.body;

  if (!NameCHS || !NameENG || !NameShort) {
    return res.redirect('/component?err=' + encodeURIComponent('Chinese Name, English Name, and Short Name are required.'));
  }

  const priorityVal = Priority !== '' && Priority !== undefined ? parseInt(Priority, 10) : null;
  const sql = `INSERT INTO Component (NameCHS, NameENG, NameShort, Remark, Priority) VALUES (?, ?, ?, ?, ?)`;

  db.run(sql, [NameCHS.trim(), NameENG.trim(), NameShort.trim(), Remark ? Remark.trim() : null, priorityVal], function(err) {
    if (err) {
      console.error('Error creating Component:', err.message);
      let errMsg = 'Failed to create component.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A component with that Chinese Name, English Name, or Short Name already exists.';
      }
      return res.redirect('/component?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/component?msg=created');
  });
});

// 3. UPDATE: Edit existing component
router.post('/update', (req, res) => {
  const { ComponentId, NameCHS, NameENG, NameShort, Remark, Priority } = req.body;

  if (!ComponentId || !NameCHS || !NameENG || !NameShort) {
    return res.redirect('/component?err=' + encodeURIComponent('Missing required fields.'));
  }

  const priorityVal = Priority !== '' && Priority !== undefined ? parseInt(Priority, 10) : null;
  const sql = `
    UPDATE Component 
    SET NameCHS = ?, NameENG = ?, NameShort = ?, Remark = ?, Priority = ?
    WHERE ComponentId = ?
  `;

  db.run(sql, [NameCHS.trim(), NameENG.trim(), NameShort.trim(), Remark ? Remark.trim() : null, priorityVal, ComponentId], function(err) {
    if (err) {
      console.error('Error updating Component:', err.message);
      let errMsg = 'Failed to update component.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A component with that Chinese Name, English Name, or Short Name already exists.';
      }
      return res.redirect('/component?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/component?msg=updated');
  });
});

// 4. DELETE: Remove component
router.post('/delete/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Component WHERE ComponentId = ?';

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting Component:', err.message);
      return res.redirect('/component?err=' + encodeURIComponent('Failed to delete component.'));
    }
    res.redirect('/component?msg=deleted');
  });
});

module.exports = router;
