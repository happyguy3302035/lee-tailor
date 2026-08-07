const express = require('express');
const router = express.Router();
const db = require('../database');

// 1. READ: List all Client Records
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM ClientInfo ORDER BY ClientId DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching client info:', err.message);
      return res.status(500).send('Database error');
    }

    res.render('clientinfo', {
      clients: rows || [],
      message: req.query.msg || null,
      error: req.query.err || null,
      activePage: 'clientinfo'
    });
  });
});

// 2. CREATE: Add new Client Record
router.post('/add', (req, res) => {
  const {
    Name, NameShort, Address,
    PrimaryContactName, PrimaryContactTel, PrimaryContactFax, PrimaryContactEmail,
    SecondaryContactName, SecondaryContactTel, SecondaryContactFax, SecondaryContactEmail,
    Remark
  } = req.body;

  if (!Name || !Name.trim() || !NameShort || !NameShort.trim()) {
    return res.redirect('/clientinfo?err=' + encodeURIComponent('Client Name and Short Name are required.'));
  }

  const sql = `
    INSERT INTO ClientInfo (
      Name, NameShort, Address,
      PrimaryContactName, PrimaryContactTel, PrimaryContactFax, PrimaryContactEmail,
      SecondaryContactName, SecondaryContactTel, SecondaryContactFax, SecondaryContactEmail,
      Remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    Name.trim(),
    NameShort.trim(),
    Address ? Address.trim() : null,
    PrimaryContactName ? PrimaryContactName.trim() : null,
    PrimaryContactTel ? PrimaryContactTel.trim() : null,
    PrimaryContactFax ? PrimaryContactFax.trim() : null,
    PrimaryContactEmail ? PrimaryContactEmail.trim() : null,
    SecondaryContactName ? SecondaryContactName.trim() : null,
    SecondaryContactTel ? SecondaryContactTel.trim() : null,
    SecondaryContactFax ? SecondaryContactFax.trim() : null,
    SecondaryContactEmail ? SecondaryContactEmail.trim() : null,
    Remark ? Remark.trim() : null
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error creating client record:', err.message);
      let errMsg = 'Failed to create client record.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A client with that Name or Short Name already exists.';
      }
      return res.redirect('/clientinfo?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/clientinfo?msg=created');
  });
});

// 3. UPDATE: Edit existing Client Record
router.post('/update', (req, res) => {
  const {
    ClientId, Name, NameShort, Address,
    PrimaryContactName, PrimaryContactTel, PrimaryContactFax, PrimaryContactEmail,
    SecondaryContactName, SecondaryContactTel, SecondaryContactFax, SecondaryContactEmail,
    Remark
  } = req.body;

  if (!ClientId || !Name || !Name.trim() || !NameShort || !NameShort.trim()) {
    return res.redirect('/clientinfo?err=' + encodeURIComponent('Client ID, Name, and Short Name are required.'));
  }

  const sql = `
    UPDATE ClientInfo SET
      Name = ?,
      NameShort = ?,
      Address = ?,
      PrimaryContactName = ?,
      PrimaryContactTel = ?,
      PrimaryContactFax = ?,
      PrimaryContactEmail = ?,
      SecondaryContactName = ?,
      SecondaryContactTel = ?,
      SecondaryContactFax = ?,
      SecondaryContactEmail = ?,
      Remark = ?
    WHERE ClientId = ?
  `;

  const params = [
    Name.trim(),
    NameShort.trim(),
    Address ? Address.trim() : null,
    PrimaryContactName ? PrimaryContactName.trim() : null,
    PrimaryContactTel ? PrimaryContactTel.trim() : null,
    PrimaryContactFax ? PrimaryContactFax.trim() : null,
    PrimaryContactEmail ? PrimaryContactEmail.trim() : null,
    SecondaryContactName ? SecondaryContactName.trim() : null,
    SecondaryContactTel ? SecondaryContactTel.trim() : null,
    SecondaryContactFax ? SecondaryContactFax.trim() : null,
    SecondaryContactEmail ? SecondaryContactEmail.trim() : null,
    Remark ? Remark.trim() : null,
    ClientId
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error updating client record:', err.message);
      let errMsg = 'Failed to update client record.';
      if (err.message.includes('UNIQUE constraint failed')) {
        errMsg = 'A client with that Name or Short Name already exists.';
      }
      return res.redirect('/clientinfo?err=' + encodeURIComponent(errMsg));
    }
    res.redirect('/clientinfo?msg=updated');
  });
});

// 4. DELETE: Remove Client Record
router.post('/delete/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM ClientInfo WHERE ClientId = ?';

  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error deleting client record:', err.message);
      return res.redirect('/clientinfo?err=' + encodeURIComponent('Failed to delete client record.'));
    }
    res.redirect('/clientinfo?msg=deleted');
  });
});

module.exports = router;
