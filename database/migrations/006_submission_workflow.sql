-- =========================================================
-- Migration 006 — submission workflow and timing provenance
--
-- Two genuinely missing fields, and nothing else. Migrations 001–005 are
-- left untouched.
--
--   historical_submissions.material_type
--       What a devotee is offering: an old photograph, a newspaper
--       clipping, an inscription photograph. The review queue needs it to
--       route material sensibly, and the public form asks for it.
--
--   settings.timings_source_type / timings_verified
--       Where the temple's opening hours came from, and whether anyone has
--       confirmed them. The database already held 06:30–11:30 and
--       16:30–20:25, and seed.js described these as supplied by the temple
--       administration — but that provenance has never been confirmed, and
--       06:30 matches the public Google listing exactly. Rather than delete
--       values that may well be correct, or keep presenting them as
--       official when they may not be, the provenance is now recorded
--       alongside them and the public site labels them accordingly.
--
-- NOT changed here: the review_status CHECK constraint. Widening it to add
-- NEEDS_MORE_INFO would need an ALTER ... DROP CONSTRAINT on PostgreSQL and
-- a full table rebuild on SQLite, and the two cannot be expressed in one
-- portable statement. The status is instead held as PENDING with the
-- request recorded in admin_notes, which needs no schema change and loses
-- nothing: a submission awaiting a reply is still awaiting review.
-- =========================================================

-- 1. What kind of material was submitted -------------------------------
ALTER TABLE historical_submissions ADD COLUMN material_type VARCHAR(60);

-- 2. Where the opening hours came from ---------------------------------
-- Values are constrained by the settings API rather than by a CHECK, since
-- `settings` is a key/value table shared by every setting.
--
--   timings_source_type : 'Temple Administration' | 'Google/Public Listing'
--                         | 'Other' | 'Unknown'
--   timings_verified    : 'true' | 'false'
--
-- Seeded as Unknown/false deliberately. Marking them verified is a decision
-- for the temple administration, not a default.
INSERT INTO settings (key, value)
SELECT 'timings_source_type', 'Unknown'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'timings_source_type');

INSERT INTO settings (key, value)
SELECT 'timings_verified', 'false'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'timings_verified');
