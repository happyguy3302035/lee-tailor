const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();

// ==========================================
// 1. Core Middlewares
// ==========================================
// Parses incoming JSON payloads (Crucial for AJAX requests in company.ejs)
app.use(express.json());
// Parses URL-encoded bodies from standard form submissions
app.use(express.urlencoded({ extended: true }));
// Serves static files (CSS, JS, Images) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. View Engine Configuration (EJS)
// ==========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==========================================
// 3. Import & Mount Modular Routes
// ==========================================
const companyApiRoutes = require('./routes/company');
app.use('/api/company', companyApiRoutes);

// ==========================================
// 4. Page Rendering Routes
// ==========================================

// Root Redirect -> /company
app.get('/', (req, res) => {
  res.redirect('/company');
});

// Company Management Page
app.get('/company', (req, res) => {
  const sql = 'SELECT * FROM CompanyInfo ORDER BY CompanyInfoId DESC';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching from CompanyInfo:', err.message);
      return res.status(500).send('Database error rendering company page');
    }
    // Render views/company.ejs and pass companies array
    res.render('company', { companies: rows || [] });
  });
});

// ==========================================
// 5. Server Initialization
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
