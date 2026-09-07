-- Migration 014: SEO, Entity Graph, and Canonical Identity Architecture
-- Host: PostgreSQL & SQLite compliant

-- 1. Add slug column to poojas if it doesn't already exist
ALTER TABLE poojas ADD COLUMN slug VARCHAR(120);

-- Backfill slugs uniquely for existing poojas
UPDATE poojas SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '/', '-')) || '-' || SUBSTR(id, 5, 8);
UPDATE poojas SET slug = 'abhishekam' WHERE id = 'pja_abhishekam';
UPDATE poojas SET slug = 'kumkuma-archana' WHERE id = 'pja_kumkuma_archana';

CREATE UNIQUE INDEX IF NOT EXISTS idx_poojas_slug ON poojas(slug);

-- 2. Add SEO metadata columns to poojas, events, temple_festivals if not present
ALTER TABLE poojas ADD COLUMN seo_title VARCHAR(200);
ALTER TABLE poojas ADD COLUMN seo_description TEXT;

ALTER TABLE events ADD COLUMN seo_title VARCHAR(200);
ALTER TABLE events ADD COLUMN seo_description TEXT;

ALTER TABLE temple_festivals ADD COLUMN seo_title VARCHAR(200);
ALTER TABLE temple_festivals ADD COLUMN seo_description TEXT;

-- 3. Update official canonical settings (Entity Identity)
UPDATE settings SET value = '"Srisomaalammatalli Temple"' WHERE key = 'temple_name';
INSERT INTO settings (key, value) VALUES ('temple_name_alt', '"Sri Somalamma Talli Temple"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
UPDATE settings SET value = '"శ్రీ సోమాలమ్మ తల్లి దేవాలయం"' WHERE key = 'temple_name_telugu';

-- Canonical address: Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh, India, PIN: 533214
UPDATE settings SET value = '"Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh, India 533214"' WHERE key = 'temple_address';
UPDATE settings SET value = '"Mungandapalem, Munjavarapu Kottu"' WHERE key = 'temple_area';
UPDATE settings SET value = '"P. Gannavaram Mandal"' WHERE key = 'temple_city';
UPDATE settings SET value = '"East Godavari District"' WHERE key = 'temple_district';
UPDATE settings SET value = '"Andhra Pradesh"' WHERE key = 'temple_state';
UPDATE settings SET value = '"533214"' WHERE key = 'temple_pincode';
UPDATE settings SET value = '"India"' WHERE key = 'temple_country';

-- Official verified contact details
UPDATE settings SET value = '"+91 98667 33559"' WHERE key = 'temple_phone';
UPDATE settings SET value = '"srisomaalammatalli@gmail.com"' WHERE key = 'temple_email';
DELETE FROM settings WHERE key IN ('listing_rating', 'listing_review_count', 'listing_source');

-- Add SEO entity configuration keys
INSERT INTO settings (key, value) VALUES ('canonical_domain', '"https://srisomaalammatalli.in"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO settings (key, value) VALUES ('seo_default_title', '"Srisomaalammatalli Temple | Mungandapalem, Andhra Pradesh"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO settings (key, value) VALUES ('seo_default_description', '"Official portal of Srisomaalammatalli Temple, Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh. Temple timings, pooja details, events, festivals, history, and official announcements."') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO settings (key, value) VALUES ('default_og_image', '"/assets/hero-banner.jpg"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO settings (key, value) VALUES ('social_facebook', '""') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO settings (key, value) VALUES ('social_instagram', '""') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO settings (key, value) VALUES ('social_youtube', '""') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO settings (key, value) VALUES ('social_maps_url', '""') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO settings (key, value) VALUES ('indexnow_key', '""') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
