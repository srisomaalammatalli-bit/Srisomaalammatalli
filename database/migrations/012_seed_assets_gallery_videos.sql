-- =========================================================
-- Migration 012 — Seed public assets into Gallery, Videos and Media
--
-- Registers the real temple photographs and video recordings
-- committed to public/assets/ into the authoritative database tables
-- (gallery, videos, media_assets, and gallery_categories)
-- so they are published and visible to devotees across the site.
-- =========================================================

-- 1. Ensure 'Videos' category exists in gallery_categories
INSERT INTO gallery_categories (id, slug, name, display_order, published)
VALUES ('gcat_videos', 'videos', 'Videos', 10, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Photographs into gallery
INSERT INTO gallery (
  id, title, title_telugu, description, image_url, category, alt_text,
  aspect_height, display_order, published, active, copyright_status, verification_status, featured
) VALUES
  (
    'gal_deity_alankaram',
    'Somalamma Talli Divya Alankaram',
    'శ్రీ సోమాలమ్మ తల్లి దివ్య అలంకారం',
    'Divya Alankaram of Sri Somalamma Thalli Amma Varu adorned with sacred garlands and haridra kumkuma.',
    '/assets/images/deity/somalamma-talli-alankaram.jpg',
    'Amma Vari',
    'Sri Somalamma Thalli Amma Varu Alankaram with garlands and turmeric',
    420, 1, TRUE, TRUE, 'OWNER', 'Verified', TRUE
  ),
  (
    'gal_deity_closeup',
    'Somalamma Talli Mukha Darshanam',
    'శ్రీ సోమాలమ్మ తల్లి ముఖ దర్శనం',
    'Sacred close-up darshanam of Sri Somalamma Thalli radiating divine grace and tranquility.',
    '/assets/images/deity/somalamma-talli-closeup.jpg',
    'Amma Vari',
    'Close up sanctum darshanam of Sri Somalamma Thalli deity',
    450, 2, TRUE, TRUE, 'OWNER', 'Verified', TRUE
  ),
  (
    'gal_deity_sanctum',
    'Garbhalaya Sanctum Darshanam',
    'గర్భాలయ దర్శనం',
    'Darshanam inside the sacred sanctum sanctorum of Sri Somalamma Thalli Temple.',
    '/assets/images/deity/somalamma-talli-sanctum.jpg',
    'Temple',
    'Garbhalaya sanctum of Sri Somalamma Thalli Temple',
    400, 3, TRUE, TRUE, 'OWNER', 'Verified', FALSE
  ),
  (
    'gal_fest_bonalu',
    'Bonalu Utsavam Procession',
    'బోనాలు ఉత్సవ ఊరేగింపు',
    'Devotees carrying sacred decorated offerings during the joyful Bonalu festival procession.',
    '/assets/images/festivals/bonalu-procession.jpg',
    'Festivals',
    'Women devotees carrying decorated Bonalu pots during the temple festival procession',
    320, 4, TRUE, TRUE, 'OWNER', 'Verified', TRUE
  ),
  (
    'gal_temple_night',
    'Temple Night Illumination',
    'రాత్రి వేళ ఆలయ విద్యుద్దీపాలంకరణ',
    'Illuminated temple gopuram and peaceful premises during annual festival nights.',
    '/assets/images/temple/temple-night-illumination.jpg',
    'Temple',
    'Sri Somalamma Thalli Temple decorated with colourful decorative illumination at night',
    300, 5, TRUE, TRUE, 'OWNER', 'Verified', TRUE
  ),
  (
    'gal_vid_fest1',
    'Temple Festival Celebrations - Part 1',
    'ఆలయ వార్షిక ఉత్సవాలు - భాగం 1',
    'Sacred rituals, processions, and devotion during the annual temple celebrations.',
    '/assets/images/videos/temple-festival-1-poster.jpg',
    'Videos',
    'Sri Somalamma Thalli annual festival video celebration part 1',
    340, 6, TRUE, TRUE, 'OWNER', 'Verified', FALSE
  ),
  (
    'gal_vid_fest2',
    'Temple Festival Celebrations - Part 2',
    'ఆలయ వార్షిక ఉత్సవాలు - భాగం 2',
    'Devotional music, traditional drum beats, and community gathering during the utsavam.',
    '/assets/images/videos/temple-festival-2-poster.jpg',
    'Videos',
    'Sri Somalamma Thalli annual festival video celebration part 2',
    340, 7, TRUE, TRUE, 'OWNER', 'Verified', FALSE
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  title_telugu = EXCLUDED.title_telugu,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  category = EXCLUDED.category,
  alt_text = EXCLUDED.alt_text,
  aspect_height = EXCLUDED.aspect_height,
  display_order = EXCLUDED.display_order,
  published = EXCLUDED.published,
  active = EXCLUDED.active;

-- 3. Seed Videos into videos table
INSERT INTO videos (
  id, title, title_telugu, description, youtube_url, thumbnail_url,
  category, duration, display_order, published, video_kind, active, copyright_status, verification_status
) VALUES
  (
    'vid_fest_celebration_1',
    'Temple Festival Celebrations - Part 1',
    'ఆలయ వార్షిక ఉత్సవాలు - భాగం 1',
    'Live recording of sacred rituals, processions, and utsavam celebrations at Sri Somalamma Thalli Temple.',
    '/assets/videos/temple-festival-1.mp4',
    '/assets/images/videos/temple-festival-1-poster.jpg',
    'Festivals',
    'Festival video',
    1, TRUE, 'UPLOAD', TRUE, 'OWNER', 'Verified'
  ),
  (
    'vid_fest_celebration_2',
    'Temple Festival Celebrations - Part 2',
    'ఆలయ వార్షిక ఉత్సవాలు - భాగం 2',
    'Celebrations, bhajans, mangala harathi, and devotee gathering during temple festival.',
    '/assets/videos/temple-festival-2.mp4',
    '/assets/images/videos/temple-festival-2-poster.jpg',
    'Festivals',
    'Festival video',
    2, TRUE, 'UPLOAD', TRUE, 'OWNER', 'Verified'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  title_telugu = EXCLUDED.title_telugu,
  description = EXCLUDED.description,
  youtube_url = EXCLUDED.youtube_url,
  thumbnail_url = EXCLUDED.thumbnail_url,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order,
  published = EXCLUDED.published,
  video_kind = EXCLUDED.video_kind,
  active = EXCLUDED.active;

-- 4. Publish existing local media assets in media_assets
UPDATE media_assets
SET published = TRUE, active = TRUE
WHERE storage_provider = 'LOCAL_ASSET';
