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
app.use('/company', companyApiRoutes);
const orderCodeRouter = require('./routes/orderCode');
app.use('/order-code', orderCodeRouter);
const componentRouter = require('./routes/component');
app.use('/component', componentRouter);
const productRouter = require('./routes/product');
app.use('/product', productRouter);
const factoryRouter = require('./routes/factory');
app.use('/factory', factoryRouter);
const transportRouter = require('./routes/transport');
app.use('/transport', transportRouter);
const clientInfoRouter = require('./routes/clientinfo');
app.use('/clientinfo', clientInfoRouter);

// ==========================================
// 4. Page Rendering Routes
// ==========================================

// Root Redirect -> /company
app.get('/', (req, res) => {
  res.redirect('/company');
});

// ==========================================
// 5. Server Initialization
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
