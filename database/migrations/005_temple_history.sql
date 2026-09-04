-- =========================================================
-- Migration 005 — temple history, evidence and festival archive
--
-- Adds only what the existing 36-table schema lacks:
--
--   temple_history          narrative history entries, ordered
--   historical_claims       individual claims with verification status
--   temple_inscriptions     inscription records, photograph and reading
--   temple_festivals        year-by-year festival archive
--   historical_submissions  material sent in by devotees, held for review
--
-- Deliberately NOT created:
--
--   temples          the site documents one temple; its name, address,
--                    timings and contact already live in `settings`, and a
--                    second home for the address is how a site ends up
--                    showing two different addresses. No temple_id column
--                    appears below for the same reason.
--   festival tables  `jathara` is a FINANCIAL record (collection, expense,
--                    contributor count) and `events` holds what is coming
--                    up. Neither can carry a historical festival archive,
--                    so temple_festivals is genuinely new rather than a
--                    duplicate.
--   audit tables     audit_logs and api/_lib/audit.js already record who
--                    changed what; the new endpoints call into it.
--
-- The evidence model is the point of this migration. Every historical
-- statement carries where it came from (source_type) and how far it can be
-- trusted (verification_status), so the site can show the difference
-- between what is documented and what is remembered. Both columns are
-- CHECK-constrained: an unrecognised status would render as an unlabelled
-- claim, which is exactly the failure this schema exists to prevent.
--
-- Portable DDL: applied verbatim on Aiven PostgreSQL, translated for
-- SQLite by database/migrate.js.
-- =========================================================

-- 1. History entries ---------------------------------------------------
CREATE TABLE IF NOT EXISTS temple_history (
  id VARCHAR(64) PRIMARY KEY,
  -- A human period label ("Eastern Chalukya period", "1911") because many
  -- entries have no exact year. year_start/year_end stay NULL rather than
  -- being guessed, and are used only for sorting when known.
  period VARCHAR(120),
  year_start INTEGER,
  year_end INTEGER,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  telugu_description TEXT,
  source_type VARCHAR(40) NOT NULL DEFAULT 'Unverified'
    CHECK (source_type IN (
      'Primary Source', 'Government Record', 'Newspaper', 'Book',
      'Academic Source', 'Local Historical Source', 'Oral History',
      'Video', 'Community Source', 'User Submitted', 'Unverified'
    )),
  source_title VARCHAR(300),
  source_url VARCHAR(1000),
  source_date DATE,
  author VARCHAR(200),
  notes TEXT,
  verification_status VARCHAR(40) NOT NULL DEFAULT 'Needs Verification'
    CHECK (verification_status IN (
      'Verified', 'Source-backed', 'Partially Documented',
      'Oral Tradition', 'Needs Verification', 'Disputed'
    )),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_history_published ON temple_history(published);
CREATE INDEX IF NOT EXISTS idx_history_order ON temple_history(display_order);
CREATE INDEX IF NOT EXISTS idx_history_year ON temple_history(year_start);
CREATE INDEX IF NOT EXISTS idx_history_verification ON temple_history(verification_status);

-- 2. Historical claims -------------------------------------------------
-- Separate from temple_history so a claim can be recorded, and tracked,
-- WITHOUT being published: "Raja Raja Narendra built the present temple"
-- belongs in the record as an unverified claim, not on the website.
CREATE TABLE IF NOT EXISTS historical_claims (
  id VARCHAR(64) PRIMARY KEY,
  claim TEXT NOT NULL,
  claim_type VARCHAR(60),
  description TEXT,
  source_type VARCHAR(40) NOT NULL DEFAULT 'Unverified'
    CHECK (source_type IN (
      'Primary Source', 'Government Record', 'Newspaper', 'Book',
      'Academic Source', 'Local Historical Source', 'Oral History',
      'Video', 'Community Source', 'User Submitted', 'Unverified'
    )),
  source_title VARCHAR(300),
  source_url VARCHAR(1000),
  source_date DATE,
  verification_status VARCHAR(40) NOT NULL DEFAULT 'Needs Verification'
    CHECK (verification_status IN (
      'Verified', 'Source-backed', 'Partially Documented',
      'Oral Tradition', 'Needs Verification', 'Disputed'
    )),
  verified_by VARCHAR(200),
  verification_date DATE,
  admin_notes TEXT,
  -- Defaults to hidden. A claim must be deliberately published, never by
  -- omission.
  public_visible BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_claims_visible ON historical_claims(public_visible);
CREATE INDEX IF NOT EXISTS idx_claims_verification ON historical_claims(verification_status);

-- 3. Inscriptions ------------------------------------------------------
-- Rows are expected to be created with transcription and translation left
-- NULL: the reading is filled in once the stone has actually been read and
-- photographed. An invented transcription would be indistinguishable from
-- a real one later, so the columns stay empty until then.
CREATE TABLE IF NOT EXISTS temple_inscriptions (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  location VARCHAR(300),
  estimated_date VARCHAR(120),
  original_language VARCHAR(80),
  transcription TEXT,
  translation TEXT,
  historical_significance TEXT,
  image_url VARCHAR(1000),
  document_url VARCHAR(1000),
  media_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL,
  source VARCHAR(300),
  source_url VARCHAR(1000),
  verification_status VARCHAR(40) NOT NULL DEFAULT 'Needs Verification'
    CHECK (verification_status IN (
      'Verified', 'Source-backed', 'Partially Documented',
      'Oral Tradition', 'Needs Verification', 'Disputed'
    )),
  public_visible BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inscriptions_visible ON temple_inscriptions(public_visible);

-- 4. Festival archive --------------------------------------------------
-- One row per festival per year. `year` is what the archive is browsed by;
-- start_date/end_date stay NULL unless the actual dates are documented, so
-- an undated year renders as "dates not documented" rather than inventing
-- a schedule.
CREATE TABLE IF NOT EXISTS temple_festivals (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  name_telugu VARCHAR(200),
  slug VARCHAR(160) NOT NULL UNIQUE,
  description TEXT,
  telugu_description TEXT,
  festival_type VARCHAR(60),
  calendar_reference VARCHAR(160),
  start_date DATE,
  end_date DATE,
  year INTEGER,
  rituals TEXT,
  special_poojas TEXT,
  procession TEXT,
  cultural_programs TEXT,
  historical_notes TEXT,
  featured_image VARCHAR(1000),
  media_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL,
  source_url VARCHAR(1000),
  source_title VARCHAR(300),
  source_type VARCHAR(40) NOT NULL DEFAULT 'Unverified'
    CHECK (source_type IN (
      'Primary Source', 'Government Record', 'Newspaper', 'Book',
      'Academic Source', 'Local Historical Source', 'Oral History',
      'Video', 'Community Source', 'User Submitted', 'Unverified'
    )),
  verification_status VARCHAR(40) NOT NULL DEFAULT 'Needs Verification'
    CHECK (verification_status IN (
      'Verified', 'Source-backed', 'Partially Documented',
      'Oral Tradition', 'Needs Verification', 'Disputed'
    )),
  -- An archive entry describes a festival that has happened. Marking one
  -- current is what puts it forward as the upcoming festival.
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_festivals_year ON temple_festivals(year);
CREATE INDEX IF NOT EXISTS idx_festivals_slug ON temple_festivals(slug);
CREATE INDEX IF NOT EXISTS idx_festivals_published ON temple_festivals(published);

-- 5. Historical submissions -------------------------------------------
-- Material offered by devotees: old photographs, invitations, clippings.
-- Never public on arrival. review_status must be moved to APPROVED by an
-- administrator, and copyright_permission records that the sender actually
-- had the right to give it.
CREATE TABLE IF NOT EXISTS historical_submissions (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  approximate_year VARCHAR(60),
  submitted_by VARCHAR(200),
  submitter_contact VARCHAR(200),
  source VARCHAR(300),
  copyright_permission VARCHAR(40) NOT NULL DEFAULT 'NOT_STATED'
    CHECK (copyright_permission IN (
      'OWNER', 'PERMISSION_GRANTED', 'PUBLIC_DOMAIN', 'NOT_STATED', 'UNKNOWN'
    )),
  image_url VARCHAR(1000),
  media_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL,
  review_status VARCHAR(24) NOT NULL DEFAULT 'PENDING'
    CHECK (review_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  verification_status VARCHAR(40) NOT NULL DEFAULT 'Needs Verification'
    CHECK (verification_status IN (
      'Verified', 'Source-backed', 'Partially Documented',
      'Oral Tradition', 'Needs Verification', 'Disputed'
    )),
  admin_notes TEXT,
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMP,
  ip_address VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON historical_submissions(review_status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON historical_submissions(created_at);

-- 6. Gallery and video provenance -------------------------------------
-- Historical photographs and third-party video need the same provenance
-- as written claims: when it is from, who holds the rights, and whether
-- the date is known or estimated.
ALTER TABLE gallery ADD COLUMN year INTEGER;
ALTER TABLE gallery ADD COLUMN taken_on DATE;
ALTER TABLE gallery ADD COLUMN source VARCHAR(300);
ALTER TABLE gallery ADD COLUMN source_url VARCHAR(1000);
ALTER TABLE gallery ADD COLUMN copyright_status VARCHAR(40) DEFAULT 'NOT_STATED';
ALTER TABLE gallery ADD COLUMN verification_status VARCHAR(40) DEFAULT 'Needs Verification';
ALTER TABLE gallery ADD COLUMN featured BOOLEAN DEFAULT FALSE;

ALTER TABLE videos ADD COLUMN year INTEGER;
ALTER TABLE videos ADD COLUMN recorded_on DATE;
ALTER TABLE videos ADD COLUMN source VARCHAR(300);
ALTER TABLE videos ADD COLUMN source_url VARCHAR(1000);
ALTER TABLE videos ADD COLUMN copyright_status VARCHAR(40) DEFAULT 'NOT_STATED';
ALTER TABLE videos ADD COLUMN verification_status VARCHAR(40) DEFAULT 'Needs Verification';
ALTER TABLE videos ADD COLUMN featured BOOLEAN DEFAULT FALSE;
