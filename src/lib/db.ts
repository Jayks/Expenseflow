import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'finance.db');

// Ensure the directory exists (though it should for the root)
const db = new Database(DB_PATH);

// Initialize tables
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT CHECK(type IN ('debit', 'credit')) NOT NULL,
      category TEXT NOT NULL,
      bank_source TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      file_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS synced_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT UNIQUE NOT NULL,
      synced_at TEXT NOT NULL
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_month_year ON transactions(month, year);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_filters ON transactions(year, month, category, type, bank_source);
  `);
}

// Call init on load
initDb();

export default db;
