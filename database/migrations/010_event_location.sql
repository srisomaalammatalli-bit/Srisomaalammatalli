-- =========================================================
-- Migration 010 — an event's location is not assumed
--
-- events.location was NOT NULL DEFAULT 'Main Sanctum' from migration 001.
-- Every event an administrator created without typing a location was
-- therefore recorded as taking place in the Main Sanctum — a specific claim
-- about where a festival happens, made by the schema rather than by anyone
-- at the temple.
--
-- The column becomes nullable with no default. A blank location now stays
-- blank, and the events page shows nothing rather than a place nobody chose.
--
-- PostgreSQL alters the column in place. SQLite cannot drop a NOT NULL or a
-- default, so it rebuilds the table and copies every row; the two forms are
-- tagged so each engine runs only its own.
-- =========================================================

-- ---------- PostgreSQL ----------
-- @pg-only
ALTER TABLE events ALTER COLUMN location DROP DEFAULT;
-- @pg-only
ALTER TABLE events ALTER COLUMN location DROP NOT NULL;

-- ---------- SQLite ----------
-- @sqlite-only
CREATE TABLE IF NOT EXISTS events_rebuilt (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  image_url TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  title_telugu TEXT,
  description_telugu TEXT,
  media_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- @sqlite-only
INSERT INTO events_rebuilt
  (id, title, slug, description, event_date, start_time, end_time, location,
   image_url, featured, published, created_at, updated_at, title_telugu,
   description_telugu, media_id, active, display_order)
SELECT
   id, title, slug, description, event_date, start_time, end_time, location,
   image_url, featured, published, created_at, updated_at, title_telugu,
   description_telugu, media_id, active, display_order
FROM events;

-- @sqlite-only
DROP TABLE events;

-- @sqlite-only
ALTER TABLE events_rebuilt RENAME TO events;

-- ---------- Both engines ----------
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(published);
