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
