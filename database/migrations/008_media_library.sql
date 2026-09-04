-- =========================================================
-- Migration 008 — media library fields
--
-- media_assets described the file well but had nowhere to put what an
-- administrator says about it. The media library needs a title in both
-- languages, a description, and the ordering and featuring flags every
-- other content table already has.
--
-- These stay empty on import: the importer reads bytes, and only a person
-- who can see the photograph should title or describe it.
--
-- Plain ADD COLUMN, so it applies identically on PostgreSQL and SQLite and
-- keeps the twelve rows already imported.
-- =========================================================

ALTER TABLE media_assets ADD COLUMN title VARCHAR(200);
ALTER TABLE media_assets ADD COLUMN title_telugu VARCHAR(200);
ALTER TABLE media_assets ADD COLUMN description TEXT;
ALTER TABLE media_assets ADD COLUMN featured BOOLEAN DEFAULT FALSE;
ALTER TABLE media_assets ADD COLUMN display_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_media_featured ON media_assets(featured);
CREATE INDEX IF NOT EXISTS idx_media_order ON media_assets(display_order);
