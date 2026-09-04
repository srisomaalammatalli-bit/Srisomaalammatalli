-- =========================================================
-- Sri Somalamma Talli Temple - Database Schema (PostgreSQL)
-- Host: Aiven PostgreSQL
-- Strict Relational Normalized Design
-- Monetary precision: NUMERIC(12, 2)
-- Timestamps: TIMESTAMPTZ
-- =========================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Admin Portal Accounts)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(128) UNIQUE,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id VARCHAR(32) NOT NULL REFERENCES roles(id) ON UPDATE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- 3. Sessions (Secure Server-Side Tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 4. Financial Years
CREATE TABLE IF NOT EXISTS financial_years (
  id VARCHAR(20) PRIMARY KEY, -- e.g. 'FY2026-27'
  label VARCHAR(64) NOT NULL UNIQUE, -- e.g. 'FY 2026–27'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Donations
CREATE TABLE IF NOT EXISTS donations (
  id VARCHAR(64) PRIMARY KEY,
  receipt_no VARCHAR(64) NOT NULL UNIQUE,
  donor_name VARCHAR(128) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(128),
  address TEXT,
  category VARCHAR(64) NOT NULL CHECK (category IN ('General Donation', 'Annual Jathara Contribution', 'Temple Development', 'Special Pooja / Seva', 'Other Contribution')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(32) NOT NULL CHECK (payment_method IN ('UPI', 'Cash', 'Bank Transfer', 'Other')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  txn_ref VARCHAR(128),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Verified' CHECK (status IN ('Verified', 'Pending', 'Failed', 'Cancelled')),
  financial_year_id VARCHAR(20) REFERENCES financial_years(id) ON UPDATE CASCADE,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(payment_date);
CREATE INDEX IF NOT EXISTS idx_donations_category ON donations(category);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_fy ON donations(financial_year_id);
CREATE INDEX IF NOT EXISTS idx_donations_receipt ON donations(receipt_no);

-- 6. Donation Receipts
CREATE TABLE IF NOT EXISTS donation_receipts (
  id VARCHAR(64) PRIMARY KEY,
  donation_id VARCHAR(64) NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  receipt_no VARCHAR(64) NOT NULL UNIQUE,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category_id VARCHAR(32) NOT NULL REFERENCES expense_categories(id) ON UPDATE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_to VARCHAR(128) NOT NULL,
  payment_method VARCHAR(32) NOT NULL CHECK (payment_method IN ('UPI', 'Cash', 'Bank Transfer', 'Cheque', 'Other')),
  description TEXT,
  receipt_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Verified' CHECK (status IN ('Verified', 'Pending', 'Rejected', 'Missing')),
  financial_year_id VARCHAR(20) REFERENCES financial_years(id) ON UPDATE CASCADE,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_fy ON expenses(financial_year_id);

-- 9. Land Income
CREATE TABLE IF NOT EXISTS land_income (
  id VARCHAR(64) PRIMARY KEY,
  source_type VARCHAR(32) NOT NULL CHECK (source_type IN ('Land Lease', 'Chit')),
  property_name VARCHAR(255) NOT NULL,
  tenant_name VARCHAR(128),
  period VARCHAR(64) NOT NULL, -- e.g. 'Annual', 'Sep 2026'
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  proof_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Verified' CHECK (status IN ('Verified', 'Pending')),
  financial_year_id VARCHAR(20) REFERENCES financial_years(id) ON UPDATE CASCADE,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_land_income_fy ON land_income(financial_year_id);

-- 10. Chit Income
CREATE TABLE IF NOT EXISTS chit_income (
  id VARCHAR(64) PRIMARY KEY,
  chit_name VARCHAR(128) NOT NULL,
  member_name VARCHAR(128),
  installment_no INT NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Overdue')),
  financial_year_id VARCHAR(20) REFERENCES financial_years(id) ON UPDATE CASCADE,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Jathara (Yearly Records)
CREATE TABLE IF NOT EXISTS jathara (
  year INT PRIMARY KEY CHECK (year >= 2000),
  title VARCHAR(128) NOT NULL,
  total_collection NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_collection >= 0),
  total_expense NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_expense >= 0),
  remaining_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  contributor_count INT NOT NULL DEFAULT 0 CHECK (contributor_count >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Upcoming', 'Active', 'Completed', 'Audited')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Jathara Milestones & Timeline
CREATE TABLE IF NOT EXISTS jathara_timeline (
  id VARCHAR(64) PRIMARY KEY,
  jathara_year INT NOT NULL REFERENCES jathara(year) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  milestone_date VARCHAR(64) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_expense BOOLEAN NOT NULL DEFAULT FALSE,
  color_code VARCHAR(32) NOT NULL DEFAULT '#2E7D5B',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Jathara Expense Categories
CREATE TABLE IF NOT EXISTS jathara_expense_categories (
  id VARCHAR(64) PRIMARY KEY,
  jathara_year INT NOT NULL REFERENCES jathara(year) ON DELETE CASCADE,
  category_name VARCHAR(128) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  display_order INT NOT NULL DEFAULT 0
);

-- 14. Events
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  event_date DATE NOT NULL,
  start_time VARCHAR(32),
  end_time VARCHAR(32),
  location VARCHAR(128) NOT NULL DEFAULT 'Main Sanctum',
  image_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(published);

-- 15. Gallery
CREATE TABLE IF NOT EXISTS gallery (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category VARCHAR(64) NOT NULL CHECK (category IN ('Temple', 'Amma Vari', 'Jathara', 'Special Events', 'Old Memories')),
  alt_text VARCHAR(255),
  aspect_height INT NOT NULL DEFAULT 300,
  display_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_cat ON gallery(category);
CREATE INDEX IF NOT EXISTS idx_gallery_published ON gallery(published);

-- 16. Videos
CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category VARCHAR(64) NOT NULL DEFAULT 'Celebrations',
  duration VARCHAR(32),
  display_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. Important Dates
CREATE TABLE IF NOT EXISTS important_dates (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  month_label VARCHAR(12) NOT NULL, -- e.g. 'FEB', 'SEP'
  day_number VARCHAR(10) NOT NULL,   -- e.g. '18', '12'
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  show_on_ticker BOOLEAN NOT NULL DEFAULT TRUE,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dates_published ON important_dates(published);
CREATE INDEX IF NOT EXISTS idx_dates_ticker ON important_dates(show_on_ticker);

-- 18. Committee Members
CREATE TABLE IF NOT EXISTS committee_members (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(128),
  role VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  avatar_bg VARCHAR(32) NOT NULL DEFAULT '#6E1F2A',
  display_order INT NOT NULL DEFAULT 0,
  last_active VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 19. Audit Logs (Immutable Ledger of All Mutations)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  user_name VARCHAR(128) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64),
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- 20. Devotee Enquiries
CREATE TABLE IF NOT EXISTS enquiries (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Read', 'Resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 21. General Settings
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
