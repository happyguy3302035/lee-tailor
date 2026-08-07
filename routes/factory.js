const express = require('express');
const router = express.Router();
const db = require('../database');

// 1. READ: List all Factories
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM Factory ORDER BY Priority ASC, FactoryId DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching factories:', err.message);
      return res.status(500).send('Database error');
    }

    res.render('factory', {
      factories: rows || [],
      message: req.query.msg || null,
      error: req.query.err || null,
      activeParent: 'system',
      activePage: 'factory'
    });
  });
});

// 2. CREATE: Add new Factory
router.post('/add', (req, res) => {
  const { Name, Priority } = req.body;

  if (!Name || !Name.trim()) {
    return res.redirect('/factory?err=' + encodeURIComponent('Factory name is required.'));
  }

  const priorityVal = Priority !== '' && Priority !== undefined ? parseInt(Priority, 10) : null;
  const sql = `INSERT INTO Factory (Name, Priority) VALUES (?, ?)`;

  db.run(sql, [Name.trim(), priorityVal], function(err) {
    if (err) {
      console.error('Error creating Factory:', err.message);
      let errMsg = 'Failed to create factory.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A factory with that name already exists.';
      }
      return res.redirect('/factory?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/factory?msg=created');
  });
});

// 3. UPDATE: Edit existing Factory
router.post('/update', (req, res) => {
  const { FactoryId, Name, Priority } = req.body;

  if (!FactoryId || !Name || !Name.trim()) {
    return res.redirect('/factory?err=' + encodeURIComponent('Factory ID and Name are required.'));
  }

  const priorityVal = Priority !== '' && Priority !== undefined ? parseInt(Priority, 10) : null;
  const sql = `UPDATE Factory SET Name = ?, Priority = ? WHERE FactoryId = ?`;

  db.run(sql, [Name.trim(), priorityVal, FactoryId], function(err) {
    if (err) {
      console.error('Error updating Factory:', err.message);
      let errMsg = 'Failed to update factory.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A factory with that name already exists.';
      }
      return res.redirect('/factory?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/factory?msg=updated');
  });
});

// 4. DELETE: Remove Factory
router.post('/delete/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Factory WHERE FactoryId = ?';

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting Factory:', err.message);
      return res.redirect('/factory?err=' + encodeURIComponent('Failed to delete factory.'));
    }
    res.redirect('/factory?msg=deleted');
  });
});

module.exports = router;
