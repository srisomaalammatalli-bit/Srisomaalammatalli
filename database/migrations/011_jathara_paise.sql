-- Jathara financial entry (Phase 11)
--
-- The Jathara tables have existed since migration 001 but nothing could write
-- to them: /api/jathara refused every method except GET, so the committee
-- could see figures and never record one. This migration prepares the tables
-- for entry.
--
-- Two changes:
--
-- 1. Money moves to integer paise, as everywhere else in this system
--    (poojas.price_paise, payments.amount_paise). The original columns are
--    NUMERIC(14,2), which is exact in PostgreSQL — but SQLite has no NUMERIC
--    type and stores them as REAL, so a locally-entered ledger drifts by
--    fractions of a paisa and stops reconciling. Integers behave identically
--    on both drivers, which matters because these figures are published to
--    devotees as the temple's accounts.
--
-- 2. Timeline entries gain a note, so a committee member can record what a
--    collection or payment was for. Without it the archive is a column of
--    amounts nobody can later explain.
--
-- The old NUMERIC columns are deliberately left in place rather than dropped:
-- they are still read by the public transparency page, and are kept in step
-- by the API, which recomputes them from the paise entries on every write.

-- @pg-only
ALTER TABLE jathara_timeline ADD COLUMN IF NOT EXISTS amount_paise BIGINT NOT NULL DEFAULT 0;
-- @pg-only
ALTER TABLE jathara_timeline ADD COLUMN IF NOT EXISTS note TEXT;
-- @pg-only
ALTER TABLE jathara_expense_categories ADD COLUMN IF NOT EXISTS amount_paise BIGINT NOT NULL DEFAULT 0;
-- @pg-only
ALTER TABLE jathara ADD COLUMN IF NOT EXISTS total_collection_paise BIGINT NOT NULL DEFAULT 0;
-- @pg-only
ALTER TABLE jathara ADD COLUMN IF NOT EXISTS total_expense_paise BIGINT NOT NULL DEFAULT 0;

-- SQLite has no ADD COLUMN IF NOT EXISTS; the migration runner applies each
-- file exactly once, so a plain ADD COLUMN is safe here.
-- @sqlite-only
ALTER TABLE jathara_timeline ADD COLUMN amount_paise BIGINT NOT NULL DEFAULT 0;
-- @sqlite-only
ALTER TABLE jathara_timeline ADD COLUMN note TEXT;
-- @sqlite-only
ALTER TABLE jathara_expense_categories ADD COLUMN amount_paise BIGINT NOT NULL DEFAULT 0;
-- @sqlite-only
ALTER TABLE jathara ADD COLUMN total_collection_paise BIGINT NOT NULL DEFAULT 0;
-- @sqlite-only
ALTER TABLE jathara ADD COLUMN total_expense_paise BIGINT NOT NULL DEFAULT 0;

-- Reading one year's ledger is the commonest query on these tables.
CREATE INDEX IF NOT EXISTS idx_jathara_timeline_year ON jathara_timeline (jathara_year, display_order);
CREATE INDEX IF NOT EXISTS idx_jathara_expense_year ON jathara_expense_categories (jathara_year, display_order);
