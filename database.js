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
    if (err) {
      console.error('Error creating CompanyInfo table:', err.message);
      return;
    }

    // Auto-seed initial record if empty
    db.get('SELECT COUNT(*) AS count FROM CompanyInfo', [], (err, row) => {
      if (!err && row.count === 0) {
        const seedSql = `
          INSERT INTO CompanyInfo (Name, Email, Phone, Address) 
          VALUES (?, ?, ?, ?)
        `;
        db.run(seedSql, ['My Company Ltd', 'info@example.com', '1131234567', 'HK'], (err) => {
          if (!err) console.log('Default CompanyInfo record created.');
        });
      }
    });
});

// Export database instance
module.exports = db;
