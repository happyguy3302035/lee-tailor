const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 1. Establish SQLite Connection
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to SQLite database:', err.message);
  } else {
    console.log('⚡ Connected to SQLite database.');
  }
});

// 2. Initialize Database Tables
db.serialize(() => {
  // CompanyInfo Table
  db.run(`
    CREATE TABLE IF NOT EXISTS CompanyInfo (
      CompanyInfoId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT UNIQUE NOT NULL,
      Email TEXT,
      Phone TEXT,
      Mobile TEXT,
      Fax TEXT,
      Address TEXT
    );
  `, (err) => {
    if (err) console.error('Error creating CompanyInfo table:', err.message);
    else console.log('✓ CompanyInfo table ready.');
  });
});

// Export database instance
module.exports = db;
