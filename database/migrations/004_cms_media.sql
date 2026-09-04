-- =========================================================
-- Migration 004 — CMS and media
--
-- Adds only what the existing 32-table schema lacks:
--
--   media_assets       metadata for files held in Cloudflare R2
--   announcements      scheduled notices and ticker messages
--   gallery_categories admin-managed categories
--   homepage_sections  which homepage blocks show, and in what order
--
-- Existing tables are reused, not recreated: events, poojas, gallery,
-- videos, temple_timings, settings, audit_logs and every payment table
-- remain exactly as they are. Each content table gains an optional
-- media_id so images can move to R2 without dropping the older
-- image_url columns, which keeps current pages working.
--
-- Binary files are never stored here. PostgreSQL holds metadata; the
-- object itself lives in R2 under media_assets.object_key.
--
-- Portable DDL: applied verbatim on Aiven PostgreSQL, translated for
-- SQLite by database/migrate.js.
-- =========================================================

-- 1. Media assets ------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
  id VARCHAR(64) PRIMARY KEY,
  media_type VARCHAR(16) NOT NULL DEFAULT 'IMAGE'
    CHECK (media_type IN ('IMAGE', 'VIDEO', 'DOCUMENT')),
  storage_provider VARCHAR(24) NOT NULL DEFAULT 'R2'
    CHECK (storage_provider IN ('R2', 'EXTERNAL_URL', 'YOUTUBE')),
  object_key VARCHAR(500),
  public_url VARCHAR(1000) NOT NULL,
  original_filename VARCHAR(255),
  safe_filename VARCHAR(255),
  mime_type VARCHAR(128),
  file_size BIGINT CHECK (file_size IS NULL OR file_size >= 0),
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  alt_text VARCHAR(300),
  caption VARCHAR(500),
  category VARCHAR(64) NOT NULL DEFAULT 'general',
  uploaded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_type ON media_assets(media_type);
CREATE INDEX IF NOT EXISTS idx_media_category ON media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_published ON media_assets(published);
CREATE INDEX IF NOT EXISTS idx_media_created ON media_assets(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_object_key ON media_assets(object_key);

-- 2. Announcements -----------------------------------------------------
--    Deliberately separate from important_dates, which is a calendar of
--    dates rather than a scheduled notice with a start and end.
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(24) NOT NULL DEFAULT 'ANNOUNCEMENT'
    CHECK (type IN ('ANNOUNCEMENT', 'URGENT', 'FESTIVAL', 'EVENT', 'CLOSURE', 'GENERAL')),
  title VARCHAR(200) NOT NULL,
  title_telugu VARCHAR(200),
  description TEXT,
  description_telugu TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  show_on_ticker BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_homepage BOOLEAN NOT NULL DEFAULT TRUE,
  dismissible BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  updated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published);
CREATE INDEX IF NOT EXISTS idx_announcements_window ON announcements(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);

-- 3. Gallery categories ------------------------------------------------
--    Admin-managed, so the committee can add categories later without
--    a code change.
CREATE TABLE IF NOT EXISTS gallery_categories (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  name_telugu VARCHAR(120),
  description VARCHAR(500),
  display_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_categories_order ON gallery_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_categories_published ON gallery_categories(published);

-- 4. Homepage sections -------------------------------------------------
--    The homepage is assembled from these rows, so the committee can
--    reorder or hide blocks without a deployment.
CREATE TABLE IF NOT EXISTS homepage_sections (
  id VARCHAR(64) PRIMARY KEY,
  section_key VARCHAR(48) NOT NULL UNIQUE,
  title VARCHAR(200),
  title_telugu VARCHAR(200),
  subtitle VARCHAR(300),
  subtitle_telugu VARCHAR(300),
  description TEXT,
  description_telugu TEXT,
  media_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL,
  button_text VARCHAR(80),
  button_url VARCHAR(300),
  secondary_button_text VARCHAR(80),
  secondary_button_url VARCHAR(300),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_order ON homepage_sections(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_sections_enabled ON homepage_sections(enabled);

-- 5. Link existing content to media assets -----------------------------
--    The older image_url columns are kept so nothing breaks; media_id is
--    preferred when set.
ALTER TABLE events ADD COLUMN media_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL;
ALTER TABLE poojas ADD COLUMN media_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL;
ALTER TABLE gallery ADD COLUMN media_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL;
ALTER TABLE videos ADD COLUMN media_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL;

-- 6. Publishing and audit fields on existing content --------------------
ALTER TABLE gallery ADD COLUMN caption_telugu VARCHAR(500);
ALTER TABLE gallery ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE gallery ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE videos ADD COLUMN description_telugu TEXT;
ALTER TABLE videos ADD COLUMN youtube_video_id VARCHAR(32);
ALTER TABLE videos ADD COLUMN video_kind VARCHAR(16) NOT NULL DEFAULT 'YOUTUBE';
ALTER TABLE videos ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE videos ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE events ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE poojas ADD COLUMN description_telugu TEXT;
ALTER TABLE poojas ADD COLUMN max_bookings INTEGER;

-- 7. Structural seed data ----------------------------------------------
--    Section keys and category names are application structure, not
--    temple facts: they carry no dates, prices or claims. Every text
--    field the public sees is left for the committee to fill in.
INSERT INTO gallery_categories (id, slug, name, display_order) VALUES
  ('gcat_temple',    'temple',    'Temple',         0),
  ('gcat_ammavari',  'ammavari',  'Amma Vari',      1),
  ('gcat_festivals', 'festivals', 'Festivals',      2),
  ('gcat_jathara',   'jathara',   'Jathara',        3),
  ('gcat_pooja',     'pooja',     'Pooja',          4),
  ('gcat_devotees',  'devotees',  'Devotees',       5),
  ('gcat_events',    'events',    'Special Events', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO homepage_sections (id, section_key, enabled, display_order) VALUES
  ('hs_hero',          'HERO',            TRUE, 0),
  ('hs_announcements', 'ANNOUNCEMENTS',   TRUE, 1),
  ('hs_timings',       'TEMPLE_TIMINGS',  TRUE, 2),
  ('hs_special',       'TODAYS_SPECIAL',  TRUE, 3),
  ('hs_poojas',        'FEATURED_POOJAS', TRUE, 4),
  ('hs_events',        'UPCOMING_EVENTS', TRUE, 5),
  ('hs_donate',        'DONATE',          TRUE, 6),
  ('hs_gallery',       'GALLERY',         TRUE, 7),
  ('hs_videos',        'VIDEOS',          TRUE, 8),
  ('hs_contact',       'CONTACT',         TRUE, 9)
ON CONFLICT (id) DO NOTHING;
