const express = require('express');
const path = require('path');

// Initialize Database connection & schemas
require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. Core Body Parsers & Static Files
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mock user context globally for EJS rendering
app.use((req, res, next) => {
  res.locals.user = { username: 'POC-Admin' };
  res.locals.activePage = '';
  next();
});

// ==========================================
// 2. Modular Route Mounting
// ==========================================
const companyRoutes = require('./routes/company');
const shortformRoutes = require('./routes/shortform');

// Direct mounting without auth wrappers
app.use('/', companyRoutes);
app.use('/', shortformRoutes);

// Root Redirect
app.get('/', (req, res) => {
  res.redirect('/company');
});

// ==========================================
// 3. Start Server
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 POC Server running on http://localhost:${PORT}`);
});
