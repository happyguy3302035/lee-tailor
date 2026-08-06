const express = require('express');
const router = express.Router();
const db = require('../database');

// 1. READ ALL: Fetch all OrderCodes ordered by Priority ascending
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM OrderCode ORDER BY Priority ASC, OrderCodeId ASC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching OrderCodes:', err.message);
      return res.status(500).send('Database error');
    }
    res.render('orderCode', {
      orderCodes: rows || [],
      message: req.query.msg || null,
      error: req.query.err || null
    });
  });
});

// 2. CREATE: Add new OrderCode
router.post('/add', (req, res) => {
  const { Name, Priority } = req.body;

  if (!Name) {
    return res.redirect('/order-code?err=Name is required');
  }

  const priorityVal = Priority !== '' ? parseInt(Priority, 10) : null;
  const sql = 'INSERT INTO OrderCode (Name, Priority) VALUES (?, ?)';

  db.run(sql, [Name.trim(), priorityVal], function (err) {
    if (err) {
      console.error('Error creating OrderCode:', err.message);
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.redirect('/order-code?err=Order Code Name already exists');
      }
      return res.redirect('/order-code?err=Failed to add Order Code');
    }
    res.redirect('/order-code?msg=created');
  });
});

// 3. UPDATE: Edit existing OrderCode
router.post('/update', (req, res) => {
  const { OrderCodeId, Name, Priority } = req.body;

  if (!OrderCodeId || !Name) {
    return res.redirect('/order-code?err=Invalid data');
  }

  const priorityVal = Priority !== '' ? parseInt(Priority, 10) : null;
  const sql = 'UPDATE OrderCode SET Name = ?, Priority = ? WHERE OrderCodeId = ?';

  db.run(sql, [Name.trim(), priorityVal, OrderCodeId], function (err) {
    if (err) {
      console.error('Error updating OrderCode:', err.message);
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.redirect('/order-code?err=Order Code Name already exists');
      }
      return res.redirect('/order-code?err=Failed to update Order Code');
    }
    res.redirect('/order-code?msg=updated');
  });
});

// 4. DELETE: Remove an OrderCode
router.post('/delete/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM OrderCode WHERE OrderCodeId = ?';

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Error deleting OrderCode:', err.message);
      return res.redirect('/order-code?err=Failed to delete Order Code');
    }
    res.redirect('/order-code?msg=deleted');
  });
});

module.exports = router;
