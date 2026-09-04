-- =========================================================
-- Migration 003
-- Payments, pooja bookings, payment claims, receipts and
-- published financial entries.
--
-- MONEY: every gateway-facing amount is stored as INTEGER
-- PAISE (BIGINT). Rupees 501.00 -> 50100. Floating point is
-- never used for money in these tables. The older
-- NUMERIC(12,2) bookkeeping columns are left untouched.
--
-- Portable DDL: applied verbatim on Aiven PostgreSQL and
-- translated for SQLite by database/migrate.js.
-- =========================================================

-- 1. Poojas gain booking attributes (the table itself exists from 002).
ALTER TABLE poojas ADD COLUMN price_paise BIGINT NOT NULL DEFAULT 0;
ALTER TABLE poojas ADD COLUMN duration_minutes INTEGER;
ALTER TABLE poojas ADD COLUMN image_url VARCHAR(500);
ALTER TABLE poojas ADD COLUMN instructions TEXT;
ALTER TABLE poojas ADD COLUMN available BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Payments
--    One row per payment attempt, whatever the provider. The temporary
--    PhonePe QR flow and a future Razorpay integration both write here, so
--    business tables never need to know which provider was used.
--
--    status lifecycle (temporary manual flow):
--      INITIATED -> PAYMENT_INSTRUCTIONS_SHOWN -> USER_CLAIMED_PAYMENT
--                -> PENDING_VERIFICATION -> VERIFIED | REJECTED
--      CANCELLED may be reached from any pre-verified state.
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  reference_id VARCHAR(32) NOT NULL UNIQUE,
  type VARCHAR(16) NOT NULL CHECK (type IN ('DONATION', 'POOJA')),
  provider VARCHAR(24) NOT NULL DEFAULT 'PHONEPE_QR' CHECK (provider IN ('PHONEPE_QR', 'RAZORPAY')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(32) NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
    'INITIATED',
    'PAYMENT_INSTRUCTIONS_SHOWN',
    'USER_CLAIMED_PAYMENT',
    'PENDING_VERIFICATION',
    'VERIFIED',
    'REJECTED',
    'CANCELLED'
  )),
  provider_order_id VARCHAR(128),
  provider_payment_id VARCHAR(128),
  provider_signature VARCHAR(256),
  utr VARCHAR(64),
  payer_name VARCHAR(128),
  payer_mobile VARCHAR(20),
  idempotency_key VARCHAR(128) UNIQUE,
  payment_claimed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_utr ON payments(utr);

-- 3. Payment claims
--    What the devotee told us after paying externally. Kept separate from
--    `payments` so an unverified claim can never be mistaken for a verified
--    payment, and so repeated claims are all preserved for the admin to review.
CREATE TABLE IF NOT EXISTS payment_claims (
  id VARCHAR(64) PRIMARY KEY,
  payment_id VARCHAR(64) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  utr VARCHAR(64) NOT NULL,
  payer_name VARCHAR(128) NOT NULL,
  payer_mobile VARCHAR(20),
  claimed_amount_paise BIGINT CHECK (claimed_amount_paise IS NULL OR claimed_amount_paise > 0),
  payment_date DATE,
  screenshot_url VARCHAR(500),
  note TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_claims_payment ON payment_claims(payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_payment_utr ON payment_claims(payment_id, utr);

-- 4. Pooja bookings
--    Business status is deliberately separate from payment status: a booking
--    is only CONFIRMED once its payment reaches VERIFIED.
CREATE TABLE IF NOT EXISTS pooja_bookings (
  id VARCHAR(64) PRIMARY KEY,
  reference_id VARCHAR(32) NOT NULL UNIQUE,
  pooja_id VARCHAR(64) NOT NULL REFERENCES poojas(id) ON UPDATE CASCADE,
  payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE SET NULL,
  devotee_name VARCHAR(128) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(128),
  preferred_date DATE NOT NULL,
  preferred_time VARCHAR(32),
  gotram VARCHAR(128),
  nakshatram VARCHAR(128),
  rashi VARCHAR(128),
  sankalpam TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN (
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PAYMENT_FAILED',
    'CANCELLED',
    'COMPLETED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON pooja_bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON pooja_bookings(preferred_date);
CREATE INDEX IF NOT EXISTS idx_bookings_pooja ON pooja_bookings(pooja_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment ON pooja_bookings(payment_id);

-- 5. Online donations (distinct from the offline `donations` ledger in 001,
--    which the committee uses to record cash and bank receipts).
CREATE TABLE IF NOT EXISTS online_donations (
  id VARCHAR(64) PRIMARY KEY,
  reference_id VARCHAR(32) NOT NULL UNIQUE,
  payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE SET NULL,
  donor_name VARCHAR(128) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(128),
  address TEXT,
  purpose VARCHAR(64) NOT NULL DEFAULT 'General Donation',
  message TEXT,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'PAID',
    'FAILED',
    'REFUNDED',
    'CANCELLED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_online_donations_status ON online_donations(status);
CREATE INDEX IF NOT EXISTS idx_online_donations_payment ON online_donations(payment_id);
CREATE INDEX IF NOT EXISTS idx_online_donations_created ON online_donations(created_at);

-- 6. Receipts — issued only after a payment is VERIFIED.
CREATE TABLE IF NOT EXISTS receipts (
  id VARCHAR(64) PRIMARY KEY,
  receipt_number VARCHAR(32) NOT NULL UNIQUE,
  payment_id VARCHAR(64) NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  type VARCHAR(16) NOT NULL CHECK (type IN ('DONATION', 'POOJA')),
  devotee_name VARCHAR(128) NOT NULL,
  description VARCHAR(200),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_method VARCHAR(32),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issued_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipts_payment ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_issued ON receipts(issued_at);

-- 7. Reference-number counters, so DON-2026-000001 style identifiers are
--    allocated atomically instead of by counting rows (which races).
CREATE TABLE IF NOT EXISTS reference_counters (
  scope VARCHAR(32) PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0
);

-- 8. Published financial entries for the public transparency page.
--    Only rows with published = TRUE are ever shown to devotees.
CREATE TABLE IF NOT EXISTS financial_entries (
  id VARCHAR(64) PRIMARY KEY,
  entry_date DATE NOT NULL,
  category VARCHAR(64) NOT NULL,
  description VARCHAR(300) NOT NULL,
  income_paise BIGINT NOT NULL DEFAULT 0 CHECK (income_paise >= 0),
  expense_paise BIGINT NOT NULL DEFAULT 0 CHECK (expense_paise >= 0),
  reference VARCHAR(64),
  financial_year_id VARCHAR(20) REFERENCES financial_years(id) ON UPDATE CASCADE,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_entries_published ON financial_entries(published);
CREATE INDEX IF NOT EXISTS idx_financial_entries_date ON financial_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_financial_entries_fy ON financial_entries(financial_year_id);
