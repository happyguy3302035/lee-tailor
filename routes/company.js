const express = require('express');
const router = express.Router();
const db = require('../database');

// Render Company Page
router.get('/company', (req, res) => {
  const sql = `SELECT * FROM CompanyInfo ORDER BY id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('company', {
      companies: rows || [],
      user: req.session ? req.session.user : { username: 'Admin' }
    });
  });
});

// GET Single Company
router.get('/api/company/:id', (req, res) => {
  const sql = `SELECT * FROM CompanyInfo WHERE id = ?`;
  db.get(sql, [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: row });
  });
});

// POST Create Company
router.post('/api/company', (req, res) => {
  const { name, email, phone, mobile, fax, address } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Company name is required' });
  }

  const sql = `
    INSERT INTO CompanyInfo (Name, Email, Phone, Mobile, Fax, Address, createddatetime, updateddatetime)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  const params = [name.trim(), email?.trim(), phone?.trim(), mobile?.trim(), fax?.trim(), address?.trim()];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: 'Company created', data: { id: this.lastID } });
  });
});

// PUT Update Company
router.put('/api/company/:id', (req, res) => {
  const { name, email, phone, mobile, fax, address } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Company name is required' });
  }

  const sql = `
    UPDATE CompanyInfo 
    SET Name = ?, Email = ?, Phone = ?, Mobile = ?, Fax = ?, Address = ?, updateddatetime = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const params = [name.trim(), email?.trim(), phone?.trim(), mobile?.trim(), fax?.trim(), address?.trim(), req.params.id];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, message: 'Company updated' });
  });
});

// DELETE Company
router.delete('/api/company/:id', (req, res) => {
  const sql = `DELETE FROM CompanyInfo WHERE id = ?`;
  db.run(sql, [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: 'Company deleted' });
  });
});

module.exports = router;
