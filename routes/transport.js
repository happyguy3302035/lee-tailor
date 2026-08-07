const express = require('express');
const router = express.Router();
const db = require('../database');

// 1. READ: Get all transport entries
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM Transport ORDER BY Priority ASC, TransportId DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching transport data:', err.message);
      return res.status(500).send('Database error');
    }

    res.render('transport', {
      transports: rows || [],
      message: req.query.msg || null,
      error: req.query.err || null,
      activeParent: 'system',
      activePage: 'transport'
    });
  });
});

// 2. CREATE: Add new transport option
router.post('/add', (req, res) => {
  const { Name, Priority } = req.body;

  if (!Name || !Name.trim()) {
    return res.redirect('/transport?err=' + encodeURIComponent('Transport name is required.'));
  }

  const priorityVal = Priority !== '' && Priority !== undefined ? parseInt(Priority, 10) : null;
  const sql = `INSERT INTO Transport (Name, Priority) VALUES (?, ?)`;

  db.run(sql, [Name.trim(), priorityVal], function(err) {
    if (err) {
      console.error('Error creating Transport:', err.message);
      let errMsg = 'Failed to create transport.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A transport entry with that name already exists.';
      }
      return res.redirect('/transport?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/transport?msg=created');
  });
});

// 3. UPDATE: Edit existing transport entry
router.post('/update', (req, res) => {
  const { TransportId, Name, Priority } = req.body;

  if (!TransportId || !Name || !Name.trim()) {
    return res.redirect('/transport?err=' + encodeURIComponent('Transport ID and Name are required.'));
  }

  const priorityVal = Priority !== '' && Priority !== undefined ? parseInt(Priority, 10) : null;
  const sql = `UPDATE Transport SET Name = ?, Priority = ? WHERE TransportId = ?`;

  db.run(sql, [Name.trim(), priorityVal, TransportId], function(err) {
    if (err) {
      console.error('Error updating Transport:', err.message);
      let errMsg = 'Failed to update transport.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A transport entry with that name already exists.';
      }
      return res.redirect('/transport?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/transport?msg=updated');
  });
});

// 4. DELETE: Remove transport entry
router.post('/delete/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Transport WHERE TransportId = ?';

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting Transport:', err.message);
      return res.redirect('/transport?err=' + encodeURIComponent('Failed to delete transport.'));
    }
    res.redirect('/transport?msg=deleted');
  });
});

module.exports = router;
