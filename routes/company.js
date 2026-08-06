const express = require('express');
const router = express.Router();
const db = require('../database');

// 1. READ: Get the single CompanyInfo record and render views/company.ejs
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM CompanyInfo LIMIT 1';
  
  db.get(sql, [], (err, row) => {
    if (err) {
      console.error('Error fetching CompanyInfo:', err.message);
      return res.status(500).send('Database error');
    }
    // Render views/company.ejs
    res.render('company', { 
      companyInfo: row || null, 
      message: req.query.msg || null 
    });
  });
});

// 2. CREATE / UPDATE (Upsert): Save the single CompanyInfo record
router.post('/save', (req, res) => {
  const { Name, Email, Phone, Mobile, Fax, Address } = req.body;

  if (!Name) {
    return res.status(400).send('Company Name is required.');
  }

  db.get('SELECT CompanyInfoId FROM CompanyInfo LIMIT 1', [], (err, row) => {
    if (err) {
      console.error('Error querying CompanyInfo:', err.message);
      return res.status(500).send('Database error');
    }

    if (row) {
      // UPDATE existing record
      const updateSql = `
        UPDATE CompanyInfo 
        SET Name = ?, Email = ?, Phone = ?, Mobile = ?, Fax = ?, Address = ?
        WHERE CompanyInfoId = ?
      `;
      db.run(updateSql, [Name, Email, Phone, Mobile, Fax, Address, row.CompanyInfoId], function(err) {
        if (err) {
          console.error('Error updating CompanyInfo:', err.message);
          return res.status(500).send('Failed to update Company Info');
        }
        res.redirect('/company?msg=updated');
      });
    } else {
      // CREATE new single record
      const insertSql = `
        INSERT INTO CompanyInfo (Name, Email, Phone, Mobile, Fax, Address)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.run(insertSql, [Name, Email, Phone, Mobile, Fax, Address], function(err) {
        if (err) {
          console.error('Error creating CompanyInfo:', err.message);
          return res.status(500).send('Failed to create Company Info');
        }
        res.redirect('/company?msg=created');
      });
    }
  });
});

module.exports = router;
