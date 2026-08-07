const express = require('express');
const router = express.Router();
const db = require('../database');

// In-memory cache store
let orderCodesCache = null;
let cacheTimestamp = 0;

// Set cache period to 1 day (24 hours)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 86,400,000 ms

// ==========================================
// 1. READ: List Client Records (Search & Pagination)
// GET /clientinfo
// ==========================================
router.get('/', (req, res) => {
  const searchQuery = (req.query.search || '').trim();
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const sortBy = req.query.sortBy || 'ClientId';
  const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';

  const offset = (page - 1) * limit;

  // Validate sortable column names to prevent SQL injection
  const allowedColumns = ['ClientId', 'Name', 'NameShort', 'PrimaryContactName'];
  const safeSortBy = allowedColumns.includes(sortBy) ? sortBy : 'ClientId';

  // Base WHERE clause
  let whereClause = '';
  const params = [];

  if (searchQuery) {
    whereClause = ` WHERE (
      LOWER(Name) LIKE LOWER(?) 
      OR LOWER(NameShort) LIKE LOWER(?) 
      OR LOWER(PrimaryContactName) LIKE LOWER(?)
    )`;
    const term = `%${searchQuery}%`;
    params.push(term, term, term);
  }

  // Query 1: Get Total Count for Pagination Math
  const countSql = `SELECT COUNT(*) AS total FROM ClientInfo ${whereClause}`;

  db.get(countSql, params, (err, countResult) => {
    if (err) {
      console.error('Error counting clients:', err.message);
      return res.status(500).send('Database error');
    }

    const totalItems = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.min(Math.max(1, page), totalPages);

    // Query 2: Fetch Paginated & Sorted Records
    const dataSql = `SELECT * FROM ClientInfo ${whereClause} ORDER BY ${safeSortBy} ${sortDir} LIMIT ? OFFSET ?`;
    const dataParams = [...params, limit, offset];

    db.all(dataSql, dataParams, (err, rows) => {
      if (err) {
        console.error('Error fetching clients:', err.message);
        return res.status(500).send('Database error');
      }

      // Helper function to generate smart page numbers with ellipsis
      function getPageNumbers(current, total) {
        const delta = 1;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= total; i++) {
          if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
            range.push(i);
          }
        }

        for (let i of range) {
          if (l) {
            if (i - l === 2) {
              rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
              rangeWithDots.push('...');
            }
          }
          rangeWithDots.push(i);
          l = i;
        }

        return rangeWithDots;
      }

      res.render('clientinfo', {
        clients: rows || [],
        searchQuery: searchQuery,
        pagination: {
          currentPage,
          totalPages,
          totalItems,
          limit,
          pageNumbers: getPageNumbers(currentPage, totalPages)
        },
        sorting: {
          sortBy: safeSortBy,
          sortDir
        },
        message: req.query.msg || null,
        error: req.query.err || null,
        activePage: 'clientinfo'
      });
    });
  });
});

// ==========================================
// 2. CREATE (Page): Render Add Client Form
// GET /clientinfo/add
// ==========================================
router.get('/add', (req, res) => {
  getCachedOrderCodes((err, orderCodes) => {
    if (err) {
      console.error('Error fetching order codes:', err.message);
      orderCodes = [];
    }
    res.render('clientinfo-add', {
      availableOrderCodes: orderCodes || [],
      activePage: 'clientinfo'
    });
  });
});

// ==========================================
// 3. CREATE (Action): Process Add Client Form
// POST /clientinfo/add
// ==========================================
router.post('/add', (req, res) => {
  const {
    Name, NameShort, Address,
    PrimaryContactName, PrimaryContactTel, PrimaryContactFax, PrimaryContactEmail,
    SecondaryContactName, SecondaryContactTel, SecondaryContactFax, SecondaryContactEmail,
    Remark, orderCodeIds
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

    const newClientId = this.lastID;

    // Handle Order Code linkages if present
    let idsToInsert = [];
    if (Array.isArray(orderCodeIds)) {
      idsToInsert = orderCodeIds;
    } else if (orderCodeIds) {
      idsToInsert = [orderCodeIds];
    }

    if (idsToInsert.length === 0) {
      return res.redirect('/clientinfo?msg=created');
    }

    // Insert linkages sequentially into ClientAndOrderCode
    const stmt = db.prepare('INSERT INTO ClientAndOrderCode (ClientId, OrderCodeId) VALUES (?, ?)');
    let insertedCount = 0;

    idsToInsert.forEach((codeId) => {
      stmt.run([newClientId, codeId], (err) => {
        if (err) {
          console.error(`Error linking OrderCode #${codeId}:`, err.message);
        }
        insertedCount++;
        if (insertedCount === idsToInsert.length) {
          stmt.finalize();
          res.redirect('/clientinfo?msg=created');
        }
      });
    });
  });
});

// ==========================================
// 4. UPDATE (Page): Render Edit Client Form
// GET /clientinfo/edit/:id
// ==========================================
router.get('/edit/:id', (req, res) => {
  const clientId = req.params.id;

  // Fetch client record
  db.get('SELECT * FROM ClientInfo WHERE ClientId = ?', [clientId], (err, client) => {
    if (err || !client) {
      return res.status(404).send('Client not found');
    }

    // Fetch linked order codes
    const linkedSql = `
      SELECT coc.OrderCodeId, oc.CodeName 
      FROM ClientAndOrderCode coc
      LEFT JOIN OrderCode oc ON coc.OrderCodeId = oc.OrderCodeId
      WHERE coc.ClientId = ?
    `;

    db.all(linkedSql, [clientId], (err, linkedOrderCodes) => {
      if (err) {
        console.error('Error fetching linked order codes:', err.message);
      }

      // Fetch all available order codes
      db.all('SELECT * FROM OrderCode', [], (err, availableOrderCodes) => {
        if (err) {
          console.error('Error fetching available order codes:', err.message);
        }

        res.render('clientinfo-edit', {
          client,
          linkedOrderCodes: linkedOrderCodes || [],
          availableOrderCodes: availableOrderCodes || [],
          activePage: 'clientinfo'
        });
      });
    });
  });
});

// ==========================================
// 5. UPDATE (Action): Process Edit Client Form
// POST /clientinfo/update
// ==========================================
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

// ==========================================
// 6. DELETE (Page): Render Delete Confirmation Screen
// GET /clientinfo/delete/:id
// ==========================================
router.get('/delete/:id', (req, res) => {
  const clientId = req.params.id;

  db.get('SELECT * FROM ClientInfo WHERE ClientId = ?', [clientId], (err, client) => {
    if (err || !client) {
      return res.status(404).send('Client not found');
    }

    res.render('clientinfo-delete', {
      client,
      activePage: 'clientinfo'
    });
  });
});

// ==========================================
// 7. DELETE (Action): Remove Client and Linkages
// POST /clientinfo/delete/:id
// ==========================================
router.post('/delete/:id', (req, res) => {
  const clientId = req.params.id;

  // Step 1: Delete linked records in ClientAndOrderCode
  db.run('DELETE FROM ClientAndOrderCode WHERE ClientId = ?', [clientId], (err) => {
    if (err) {
      console.error('Error clearing linkages:', err.message);
      return res.redirect('/clientinfo?err=' + encodeURIComponent('Failed to delete associated linkages.'));
    }

    // Step 2: Delete parent record in ClientInfo
    db.run('DELETE FROM ClientInfo WHERE ClientId = ?', [clientId], function (err) {
      if (err) {
        console.error('Error deleting client:', err.message);
        return res.redirect('/clientinfo?err=' + encodeURIComponent('Failed to delete client record.'));
      }

      res.redirect('/clientinfo?msg=deleted');
    });
  });
});

// Helper to fetch OrderCodes from Cache or DB
function getCachedOrderCodes(callback) {
  const now = Date.now();

  // Return cached data if valid and within 24 hours
  if (orderCodesCache && (now - cacheTimestamp < CACHE_TTL_MS)) {
    return callback(null, orderCodesCache);
  }

  db.all('SELECT * FROM OrderCode', [], (err, rows) => {
    if (!err) {
      orderCodesCache = rows || [];
      cacheTimestamp = now;
    }
    callback(err, orderCodesCache || []);
  });
}

// Function to manually clear cache whenever OrderCodes are updated
function clearOrderCodeCache() {
  orderCodesCache = null;
  cacheTimestamp = 0;
}
module.exports = router;
