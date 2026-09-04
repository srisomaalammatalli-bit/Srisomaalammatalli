-- =========================================================
-- Migration 009 — one gallery category vocabulary
--
-- The problem: gallery.category carried a CHECK constraint listing five
-- fixed values from migration 001, while gallery_categories holds the
-- admin-managed list. They disagree. gallery_categories already contains
-- "Festivals", "Pooja" and "Devotees", none of which the CHECK allows — so
-- an administrator could create a category, pick it, and get a 500 with no
-- explanation. Meanwhile the CHECK still permitted "Old Memories", which is
-- no longer in the category list at all.
--
-- The fix: gallery_categories becomes the only vocabulary. The CHECK is
-- removed and the API validates against the table instead, so adding a
-- category is enough to make it usable.
--
-- Deliberately NOT a foreign key. Deleting or retiring a category must not
-- delete photographs or block the delete; a gallery row keeps the category
-- name it was filed under, and the admin screen shows an unknown category as
-- retired rather than losing the record. A hard FK would make removing a
-- category either impossible or destructive, and neither is acceptable for
-- a temple's photographs.
--
-- PostgreSQL drops the constraint in place. SQLite cannot, so it rebuilds
-- the table and copies every row; the two forms are tagged so each engine
-- runs only its own.
-- =========================================================

-- ---------- PostgreSQL ----------
-- The constraint is unnamed in migration 001, so PostgreSQL generated
-- gallery_category_check. IF EXISTS keeps this safe on a database where it
-- was already removed or never created.
-- @pg-only
ALTER TABLE gallery DROP CONSTRAINT IF EXISTS gallery_category_check;

-- ---------- SQLite ----------
-- Rebuild without the CHECK, preserving every existing row. The column list
-- is written out explicitly so the copy cannot silently drop a column.
-- @sqlite-only
CREATE TABLE IF NOT EXISTS gallery_rebuilt (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  alt_text TEXT,
  aspect_height INT NOT NULL DEFAULT 300,
  display_order INT NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  title_telugu TEXT,
  media_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
  caption_telugu TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT,
  year INTEGER,
  taken_on DATE,
  source TEXT,
  source_url TEXT,
  copyright_status TEXT DEFAULT 'NOT_STATED',
  verification_status TEXT DEFAULT 'Needs Verification',
  featured INTEGER DEFAULT 0
);

-- @sqlite-only
INSERT INTO gallery_rebuilt
  (id, title, description, image_url, category, alt_text, aspect_height,
   display_order, published, created_at, title_telugu, media_id, caption_telugu,
   active, updated_at, year, taken_on, source, source_url, copyright_status,
   verification_status, featured)
SELECT
   id, title, description, image_url, category, alt_text, aspect_height,
   display_order, published, created_at, title_telugu, media_id, caption_telugu,
   active, updated_at, year, taken_on, source, source_url, copyright_status,
   verification_status, featured
FROM gallery;

-- @sqlite-only
DROP TABLE gallery;

-- @sqlite-only
ALTER TABLE gallery_rebuilt RENAME TO gallery;

-- ---------- Both engines ----------
-- Indexes are recreated because the SQLite rebuild dropped them with the old
-- table; IF NOT EXISTS makes this a no-op on PostgreSQL.
CREATE INDEX IF NOT EXISTS idx_gallery_cat ON gallery(category);
CREATE INDEX IF NOT EXISTS idx_gallery_published ON gallery(published);
CREATE INDEX IF NOT EXISTS idx_gallery_featured ON gallery(featured);

-- Any category a photograph is already filed under must exist in the
-- authoritative list, so nothing that was valid before this migration
-- becomes unselectable after it. The slug matches the API's slugify().
INSERT INTO gallery_categories (id, slug, name, display_order, published)
SELECT 'gcat_oldmemories', 'old-memories', 'Old Memories', 90, TRUE
WHERE NOT EXISTS (SELECT 1 FROM gallery_categories WHERE name = 'Old Memories');
