-- =========================================================
-- Migration 007 — local assets and R2 migration tracking
--
-- media_assets was written assuming every file would arrive through an R2
-- upload. The temple's existing photographs and video already sit in
-- public/assets/, so the table needs to be able to describe a file served
-- from the site itself, and to record what happened when that file is
-- later copied to R2.
--
-- The table is recreated rather than altered because widening a CHECK
-- constraint cannot be expressed portably: PostgreSQL needs DROP/ADD
-- CONSTRAINT, SQLite needs a full table rebuild, and the migration runner
-- applies one statement list to both. Recreating is safe here only because
-- media_assets is empty — no file has been imported yet. It would not be
-- safe once the temple's media is in it, which is why this is done now.
--
-- What changes:
--   storage_provider  gains 'LOCAL_ASSET'
--   source_path       where the file came from, kept after an R2 upload so
--                     the original stays identifiable and is never deleted
--                     on the strength of a database row alone
--   checksum          sha256 of the bytes; this is what makes the import
--                     idempotent, since the same file re-imported is
--                     recognised rather than duplicated
--   r2_object_key     set only once an upload has actually succeeded
--   r2_uploaded_at    when that happened; NULL means "still local only"
--
-- Every other column keeps its original definition from migration 004.
-- =========================================================

-- @pg-only
DROP TABLE IF EXISTS media_assets CASCADE;

-- @sqlite-only
DROP TABLE IF EXISTS media_assets;

CREATE TABLE media_assets (
  id VARCHAR(64) PRIMARY KEY,
  media_type VARCHAR(16) NOT NULL DEFAULT 'IMAGE'
    CHECK (media_type IN ('IMAGE', 'VIDEO', 'DOCUMENT')),
  -- LOCAL_ASSET: a file committed under public/assets/ and served by the
  -- site itself. It is a real, valid home for a file, not a placeholder
  -- state — the temple's own photographs live there today.
  storage_provider VARCHAR(24) NOT NULL DEFAULT 'R2'
    CHECK (storage_provider IN ('R2', 'EXTERNAL_URL', 'YOUTUBE', 'LOCAL_ASSET')),
  object_key VARCHAR(500),
  public_url VARCHAR(1000) NOT NULL,
  original_filename VARCHAR(255),
  safe_filename VARCHAR(255),
  mime_type VARCHAR(128),
  file_size BIGINT CHECK (file_size IS NULL OR file_size >= 0),
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  -- Written by an administrator who can see the photograph. The importer
  -- leaves them empty rather than describing an image it cannot see.
  alt_text VARCHAR(300),
  caption VARCHAR(500),
  category VARCHAR(64),
  uploaded_by VARCHAR(64),
  published BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  -- Provenance and R2 migration state.
  source_path VARCHAR(500),
  checksum VARCHAR(64),
  r2_object_key VARCHAR(500),
  r2_uploaded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The checksum is the idempotency key for re-running the importer; the
-- others serve the media library's filters.
CREATE INDEX IF NOT EXISTS idx_media_checksum ON media_assets(checksum);
CREATE INDEX IF NOT EXISTS idx_media_source_path ON media_assets(source_path);
CREATE INDEX IF NOT EXISTS idx_media_provider ON media_assets(storage_provider);
CREATE INDEX IF NOT EXISTS idx_media_kind ON media_assets(media_type);
CREATE INDEX IF NOT EXISTS idx_media_published ON media_assets(published);
