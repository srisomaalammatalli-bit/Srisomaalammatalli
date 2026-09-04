-- =========================================================
-- Migration 002
-- Adds: poojas / sevas, weekly temple timings, published
--       financial-transparency records, and Telugu title
--       columns for bilingual content.
--
-- Written as portable DDL: applied verbatim on Aiven
-- PostgreSQL, and translated for SQLite by database/migrate.js.
-- =========================================================

-- 1. Poojas & Sevas (Abhishekam, Kumkuma Archana, special poojas)
CREATE TABLE IF NOT EXISTS poojas (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  name_telugu VARCHAR(160),
  description TEXT,
  pooja_time VARCHAR(32),
  day_of_week VARCHAR(16),
  is_daily BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_poojas_published ON poojas(published);
CREATE INDEX IF NOT EXISTS idx_poojas_order ON poojas(display_order);

-- 2. Temple timings, one row per weekday plus optional special-day overrides.
CREATE TABLE IF NOT EXISTS temple_timings (
  id VARCHAR(64) PRIMARY KEY,
  day_of_week VARCHAR(16) NOT NULL,
  morning_open VARCHAR(8),
  morning_close VARCHAR(8),
  evening_open VARCHAR(8),
  evening_close VARCHAR(8),
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  is_special BOOLEAN NOT NULL DEFAULT FALSE,
  special_date DATE,
  special_note TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_timings_day ON temple_timings(day_of_week);
CREATE INDEX IF NOT EXISTS idx_timings_special ON temple_timings(is_special);

-- 3. Published financial-transparency records.
--    One published summary per financial year. Amounts default to 0 and are
--    set from real temple accounts; nothing is fabricated.
CREATE TABLE IF NOT EXISTS financial_records (
  id VARCHAR(64) PRIMARY KEY,
  financial_year_id VARCHAR(20) NOT NULL REFERENCES financial_years(id) ON UPDATE CASCADE ON DELETE CASCADE,
  total_donations NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_donations >= 0),
  total_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_expenses >= 0),
  event_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (event_expenses >= 0),
  maintenance_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (maintenance_expenses >= 0),
  pooja_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (pooja_expenses >= 0),
  other_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (other_expenses >= 0),
  notes TEXT,
  report_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_records_fy ON financial_records(financial_year_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_published ON financial_records(published);

-- 4. Bilingual content columns (English titles already exist).
ALTER TABLE events ADD COLUMN title_telugu VARCHAR(200);
ALTER TABLE events ADD COLUMN description_telugu TEXT;
ALTER TABLE gallery ADD COLUMN title_telugu VARCHAR(200);
ALTER TABLE videos ADD COLUMN title_telugu VARCHAR(200);
ALTER TABLE important_dates ADD COLUMN title_telugu VARCHAR(200);

-- 5. Contact enquiries: capture an optional email and admin handling notes.
ALTER TABLE enquiries ADD COLUMN email VARCHAR(128);
ALTER TABLE enquiries ADD COLUMN subject VARCHAR(200);
ALTER TABLE enquiries ADD COLUMN admin_notes TEXT;
