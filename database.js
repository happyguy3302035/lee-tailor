const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Resolve path to SQLite database file
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Initialize database schema
db.serialize(() => {
  // 1. Enable foreign key constraints
  db.run('PRAGMA foreign_keys = ON;');

  // 2. Create CompanyInfo table with UNIQUE NOT NULL Name constraint
  db.run(`
    CREATE TABLE IF NOT EXISTS CompanyInfo (
      CompanyInfoId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT UNIQUE NOT NULL,
      Email TEXT,
      Phone TEXT,
      Mobile TEXT,
      Fax TEXT,
      Address TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating CompanyInfo table:', err.message);
    } else {
      console.log('CompanyInfo table initialized successfully.');

      // 3. Auto-seed default record if table is empty
      db.get('SELECT COUNT(*) AS count FROM CompanyInfo', [], (err, row) => {
        if (!err && row && row.count === 0) {
          const seedSql = `
            INSERT INTO CompanyInfo (Name, Email, Phone, Address) 
            VALUES (?, ?, ?, ?)
          `;
          db.run(seedSql, ['My Company Ltd', 'info@example.com', '1131234567', 'HK'], (err) => {
            if (!err) {
              console.log('Default CompanyInfo record created.');
            } else {
              console.error('Error seeding default CompanyInfo:', err.message);
            }
          });
        }
      });
    }
  });
  
  // 2. OrderCode Table
  db.run(`
    CREATE TABLE IF NOT EXISTS OrderCode (
      OrderCodeId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT UNIQUE NOT NULL,
      Priority INTEGER
    )
  `, (err) => {
    if (err) {
      console.error('Error creating OrderCode table:', err.message);
    } else {
      console.log('OrderCode table initialized successfully.');
    }
  });

  // 2. Component Table
  db.run(`
    CREATE TABLE IF NOT EXISTS Component (
      ComponentId INTEGER PRIMARY KEY AUTOINCREMENT,
      NameCHS TEXT UNIQUE NOT NULL,
      NameENG TEXT UNIQUE NOT NULL,
      NameShort TEXT UNIQUE NOT NULL,
      Remark TEXT,
      Priority INTEGER
    )
  `, (err) => {
    if (err) {
      console.error('Error creating Component table:', err.message);
    } else {
      console.log('Component table initialized successfully.');
    }
  });


  
});

module.exports = db;
