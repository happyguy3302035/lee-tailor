const express = require('express');
const router = express.Router();
const db = require('../database');

// 1. READ: List Client Records with Search
// GET /clientinfo
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
