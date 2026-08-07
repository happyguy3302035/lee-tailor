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
      message: req.query.msg || null,
      activePage: 'company' 
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

// ==========================================
// 1. GET /clientinfo/add
// ==========================================
router.get('/add', (req, res) => {
  db.all('SELECT * FROM OrderCode ORDER BY OrderCodeId ASC', [], (err, orderCodes) => {
    if (err) {
      console.error('Error fetching order codes:', err.message);
      orderCodes = [];
    }
    res.render('clientinfo-add', {
      availableOrderCodes: orderCodes,
      linkedOrderCodes: [],
      activePage: 'clientinfo'
    });
  });
});

// ==========================================
// 2. POST /clientinfo/add
// ==========================================
router.post('/add', (req, res) => {
  const { Name, NameShort, PrimaryContactName /*, other ClientInfo fields */ } = req.body;
  
  // Normalize array input from form
  let orderCodeIds = req.body['orderCodeIds[]'] || req.body.orderCodeIds || [];
  if (!Array.isArray(orderCodeIds)) {
    orderCodeIds = [orderCodeIds];
  }

  const sqlInsertClient = `INSERT INTO ClientInfo (Name, NameShort, PrimaryContactName) VALUES (?, ?, ?)`;

  db.run(sqlInsertClient, [Name, NameShort, PrimaryContactName], function (err) {
    if (err) {
      console.error('Error inserting ClientInfo:', err.message);
      return res.status(500).send('Database Error');
    }

    const newClientId = this.lastID;

    // Save ClientAndOrderCode linkages
    if (orderCodeIds.length > 0) {
      const stmt = db.prepare('INSERT INTO ClientAndOrderCode (ClientId, OrderCodeId) VALUES (?, ?)');
      orderCodeIds.forEach(orderCodeId => {
        stmt.run([newClientId, orderCodeId]);
      });
      stmt.finalize();
    }

    res.redirect('/clientinfo?msg=Client+created+successfully');
  });
});

// ==========================================
// 3. GET /clientinfo/edit/:id
// ==========================================
router.get('/edit/:id', (req, res) => {
  const clientId = req.params.id;

  // Query 1: Fetch Client Info
  db.get('SELECT * FROM ClientInfo WHERE ClientId = ?', [clientId], (err, client) => {
    if (err || !client) {
      return res.status(404).send('Client not found');
    }

    // Query 2: Fetch All Order Codes for Dropdown
    db.all('SELECT * FROM OrderCode ORDER BY OrderCodeId ASC', [], (err, availableOrderCodes) => {
      if (err) availableOrderCodes = [];

      // Query 3: Fetch Currently Linked Order Codes for this Client
      const linkedSql = `
        SELECT cl.ClientAndOrderCodeId, cl.OrderCodeId, oc.CodeName
        FROM ClientAndOrderCode cl
        JOIN OrderCode oc ON cl.OrderCodeId = oc.OrderCodeId
        WHERE cl.ClientId = ?
      `;

      db.all(linkedSql, [clientId], (err, linkedOrderCodes) => {
        if (err) linkedOrderCodes = [];

        res.render('clientinfo-edit', {
          client,
          availableOrderCodes,
          linkedOrderCodes: linkedOrderCodes || [],
          activePage: 'clientinfo'
        });
      });
    });
  });
});

// ==========================================
// 4. POST /clientinfo/edit/:id
// ==========================================
router.post('/edit/:id', (req, res) => {
  const clientId = req.params.id;
  const { Name, NameShort, PrimaryContactName } = req.body;

  // Normalize array input from form
  let orderCodeIds = req.body['orderCodeIds[]'] || req.body.orderCodeIds || [];
  if (!Array.isArray(orderCodeIds)) {
    orderCodeIds = [orderCodeIds];
  }

  const sqlUpdateClient = `UPDATE ClientInfo SET Name = ?, NameShort = ?, PrimaryContactName = ? WHERE ClientId = ?`;

  db.run(sqlUpdateClient, [Name, NameShort, PrimaryContactName, clientId], function (err) {
    if (err) {
      console.error('Error updating ClientInfo:', err.message);
      return res.status(500).send('Database Error');
    }

    // Refresh linkages: Delete existing linkages then insert new ones
    db.run('DELETE FROM ClientAndOrderCode WHERE ClientId = ?', [clientId], (err) => {
      if (err) {
        console.error('Error clearing old linkages:', err.message);
      }

      if (orderCodeIds.length > 0) {
        const stmt = db.prepare('INSERT INTO ClientAndOrderCode (ClientId, OrderCodeId) VALUES (?, ?)');
        orderCodeIds.forEach(orderCodeId => {
          stmt.run([clientId, orderCodeId]);
        });
        stmt.finalize();
      }

      res.redirect('/clientinfo?msg=Client+updated+successfully');
    });
  });
});
module.exports = router;
