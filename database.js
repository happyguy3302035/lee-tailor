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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Email TEXT,
      Phone TEXT,
      Mobile TEXT,
      Fax TEXT,
      Address TEXT,
      createddatetime DATETIME DEFAULT CURRENT_TIMESTAMP,
      updateddatetime DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, (err) => {
    if (err) console.error('Error creating CompanyInfo table:', err.message);
    else console.log('✓ CompanyInfo table ready.');
  });

  // ShortForm Table
  db.run(`
    CREATE TABLE IF NOT EXISTS ShortForm (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ShortForm TEXT NOT NULL,
      createddatetime DATETIME DEFAULT CURRENT_TIMESTAMP,
      updateddatetime DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, (err) => {
    if (err) console.error('Error creating ShortForm table:', err.message);
    else console.log('✓ ShortForm table ready.');
  });
});

// Export database instance
module.exports = db;
