const express = require('express');
const router = express.Router();
const db = require('../database'); // Adjust relative path to your SQLite database module

// 1. GET all companies
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM CompanyInfo ORDER BY id DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// 2. GET single company by ID (useful for populating edit form)
router.get('/:id', (req, res) => {
  const sql = 'SELECT * FROM CompanyInfo WHERE id = ?';
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    res.json({ success: true, data: row });
  });
});

// 3. POST - Insert new company (Fills createddatetime and updateddatetime)
router.post('/', (req, res) => {
  const { name, email, phone, mobile, fax, address } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Company Name is required' });
  }

  const sql = `
    INSERT INTO CompanyInfo (Name, Email, Phone, Mobile, Fax, Address)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [
    name,
    email || '',
    phone || '',
    mobile || '',
    fax || '',
    address || ''
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error inserting company:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }

    res.json({
      success: true,
      message: 'Company created successfully',
      data: { id: this.lastID }
    });
  });
});

// 4. PUT - Update existing company (Refreshes updateddatetime only)
router.put('/:id', (req, res) => {
  const { name, email, phone, mobile, fax, address } = req.body;
  const companyId = req.params.id;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Company Name is required' });
  }

  const sql = `
    UPDATE CompanyInfo
    SET Name = ?,
        Email = ?,
        Phone = ?,
        Mobile = ?,
        Fax = ?,
        Address = ?
    WHERE id = ?
  `;
  const params = [
    name,
    email || '',
    phone || '',
    mobile || '',
    fax || '',
    address || '',
    companyId
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error updating company:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({
      success: true,
      message: 'Company updated successfully'
    });
  });
});

// 5. DELETE - Remove company
router.delete('/:id', (req, res) => {
  const sql = 'DELETE FROM CompanyInfo WHERE id = ?';
  db.run(sql, [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, message: 'Company deleted' });
  });
});

module.exports = router;
