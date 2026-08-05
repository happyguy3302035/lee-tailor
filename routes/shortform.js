const express = require('express');
const router = express.Router();
const db = require('../database');

// Render ShortForm Page
router.get('/shortform', (req, res) => {
  const sql = `SELECT * FROM ShortForm ORDER BY id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('shortform', {
      activePage: 'shortform',
      shortforms: rows || [],
      user: req.session ? req.session.user : { username: 'Admin' }
    });
  });
});

// GET Single ShortForm
router.get('/api/shortform/:id', (req, res) => {
  const sql = `SELECT * FROM ShortForm WHERE id = ?`;
  db.get(sql, [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: row });
  });
});

// POST Create ShortForm
router.post('/api/shortform', (req, res) => {
  const { shortform } = req.body;
  if (!shortform || !shortform.trim()) {
    return res.status(400).json({ success: false, message: 'ShortForm is required.' });
  }

  const sql = `
    INSERT INTO ShortForm (ShortForm, createddatetime, updateddatetime)
    VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  db.run(sql, [shortform.trim()], function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, id: this.lastID, message: 'ShortForm created successfully.' });
  });
});

// PUT Update ShortForm
router.put('/api/shortform/:id', (req, res) => {
  const { shortform } = req.body;
  if (!shortform || !shortform.trim()) {
    return res.status(400).json({ success: false, message: 'ShortForm is required.' });
  }

  const sql = `
    UPDATE ShortForm 
    SET ShortForm = ?, updateddatetime = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(sql, [shortform.trim(), req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: 'ShortForm updated successfully.' });
  });
});

// DELETE ShortForm
router.delete('/api/shortform/:id', (req, res) => {
  const sql = `DELETE FROM ShortForm WHERE id = ?`;
  db.run(sql, [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: 'ShortForm deleted successfully.' });
  });
});

module.exports = router;
