import { query } from '../../_lib/db.js';
import { sendSuccess, sendUnauthorized, sendError } from '../../_lib/response.js';
import { getAuthenticatedUser } from '../../_lib/auth.js';

export default async function syncAssetsHandler(req, res) {
  const user = await getAuthenticatedUser(req).catch(() => null);
  if (!user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  try {
    // 1. Ensure media_blobs table exists
    await query(`
      CREATE TABLE IF NOT EXISTS media_blobs (
        id VARCHAR(64) PRIMARY KEY,
        mime_type VARCHAR(128) NOT NULL,
        data TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Publish all local assets in media_assets
    await query(`
      UPDATE media_assets
      SET published = TRUE, active = TRUE
      WHERE storage_provider = 'LOCAL_ASSET'
    `);

    // 3. Ensure gallery_categories exist
    const categories = [
      { id: 'gcat_amma_vari', slug: 'amma-vari', name: 'Amma Vari', display_order: 1 },
      { id: 'gcat_temple', slug: 'temple', name: 'Temple', display_order: 2 },
      { id: 'gcat_festivals', slug: 'festivals', name: 'Festivals', display_order: 3 },
      { id: 'gcat_videos', slug: 'videos', name: 'Videos', display_order: 4 },
      { id: 'gcat_pooja', slug: 'pooja', name: 'Pooja', display_order: 5 }
    ];

    for (const cat of categories) {
      await query(
        `INSERT INTO gallery_categories (id, slug, name, display_order, published)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, published = TRUE`,
        [cat.id, cat.slug, cat.name, cat.display_order]
      );
    }

    // 4. Seed Photographs into gallery
    const photos = [
      {
        id: 'gal_deity_alankaram',
        title: 'Somalamma Talli Divya Alankaram',
        title_telugu: 'శ్రీ సోమాలమ్మ తల్లి దివ్య అలంకారం',
        description: 'Divya Alankaram of Sri Somalamma Thalli Amma Varu adorned with sacred garlands and haridra kumkuma.',
        image_url: '/assets/images/deity/somalamma-talli-alankaram.jpg',
        category: 'Amma Vari',
        alt_text: 'Sri Somalamma Thalli Amma Varu Alankaram with garlands and turmeric',
        aspect_height: 420,
        display_order: 1
      },
      {
        id: 'gal_deity_closeup',
        title: 'Somalamma Talli Mukha Darshanam',
        title_telugu: 'శ్రీ సోమాలమ్మ తల్లి ముఖ దర్శనం',
        description: 'Sacred close-up darshanam of Sri Somalamma Thalli radiating divine grace and tranquility.',
        image_url: '/assets/images/deity/somalamma-talli-closeup.jpg',
        category: 'Amma Vari',
        alt_text: 'Close up sanctum darshanam of Sri Somalamma Thalli deity',
        aspect_height: 450,
        display_order: 2
      },
      {
        id: 'gal_deity_sanctum',
        title: 'Garbhalaya Sanctum Darshanam',
        title_telugu: 'గర్భాలయ దర్శనం',
        description: 'Darshanam inside the sacred sanctum sanctorum of Sri Somalamma Thalli Temple.',
        image_url: '/assets/images/deity/somalamma-talli-sanctum.jpg',
        category: 'Temple',
        alt_text: 'Garbhalaya sanctum of Sri Somalamma Thalli Temple',
        aspect_height: 400,
        display_order: 3
      },
      {
        id: 'gal_fest_bonalu',
        title: 'Bonalu Utsavam Procession',
        title_telugu: 'బోనాలు ఉత్సవ ఊరేగింపు',
        description: 'Devotees carrying sacred decorated offerings during the joyful Bonalu festival procession.',
        image_url: '/assets/images/festivals/bonalu-procession.jpg',
        category: 'Festivals',
        alt_text: 'Women devotees carrying decorated Bonalu pots during the temple festival procession',
        aspect_height: 320,
        display_order: 4
      },
      {
        id: 'gal_temple_night',
        title: 'Temple Night Illumination',
        title_telugu: 'రాత్రి వేళ ఆలయ విద్యుద్దీపాలంకరణ',
        description: 'Illuminated temple gopuram and peaceful premises during annual festival nights.',
        image_url: '/assets/images/temple/temple-night-illumination.jpg',
        category: 'Temple',
        alt_text: 'Sri Somalamma Thalli Temple decorated with colourful decorative illumination at night',
        aspect_height: 300,
        display_order: 5
      },
      {
        id: 'gal_vid_fest1',
        title: 'Temple Festival Celebrations - Part 1',
        title_telugu: 'ఆలయ వార్షిక ఉత్సవాలు - భాగం 1',
        description: 'Sacred rituals, processions, and devotion during the annual temple celebrations.',
        image_url: '/assets/images/videos/temple-festival-1-poster.jpg',
        category: 'Videos',
        alt_text: 'Sri Somalamma Thalli annual festival video celebration part 1',
        aspect_height: 340,
        display_order: 6
      },
      {
        id: 'gal_vid_fest2',
        title: 'Temple Festival Celebrations - Part 2',
        title_telugu: 'ఆలయ వార్షిక ఉత్సవాలు - భాగం 2',
        description: 'Devotional music, traditional drum beats, and community gathering during the utsavam.',
        image_url: '/assets/images/videos/temple-festival-2-poster.jpg',
        category: 'Videos',
        alt_text: 'Sri Somalamma Thalli annual festival video celebration part 2',
        aspect_height: 340,
        display_order: 7
      }
    ];

    for (const p of photos) {
      await query(
        `INSERT INTO gallery (
          id, title, title_telugu, description, image_url, category, alt_text,
          aspect_height, display_order, published, active, copyright_status, verification_status, featured
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE, 'OWNER', 'Verified', TRUE)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          title_telugu = EXCLUDED.title_telugu,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url,
          category = EXCLUDED.category,
          alt_text = EXCLUDED.alt_text,
          aspect_height = EXCLUDED.aspect_height,
          display_order = EXCLUDED.display_order,
          published = TRUE,
          active = TRUE`,
        [
          p.id,
          p.title,
          p.title_telugu,
          p.description,
          p.image_url,
          p.category,
          p.alt_text,
          p.aspect_height,
          p.display_order
        ]
      );
    }

    // 5. Seed Videos into videos table
    const videos = [
      {
        id: 'vid_fest_celebration_1',
        title: 'Temple Festival Celebrations - Part 1',
        title_telugu: 'ఆలయ వార్షిక ఉత్సవాలు - భాగం 1',
        description: 'Live recording of sacred rituals, processions, and utsavam celebrations at Sri Somalamma Thalli Temple.',
        youtube_url: '/assets/videos/temple-festival-1.mp4',
        thumbnail_url: '/assets/images/videos/temple-festival-1-poster.jpg',
        category: 'Festivals',
        duration: 'Festival video',
        display_order: 1
      },
      {
        id: 'vid_fest_celebration_2',
        title: 'Temple Festival Celebrations - Part 2',
        title_telugu: 'ఆలయ వార్షిక ఉత్సవాలు - భాగం 2',
        description: 'Celebrations, bhajans, mangala harathi, and devotee gathering during temple festival.',
        youtube_url: '/assets/videos/temple-festival-2.mp4',
        thumbnail_url: '/assets/images/videos/temple-festival-2-poster.jpg',
        category: 'Festivals',
        duration: 'Festival video',
        display_order: 2
      }
    ];

    for (const v of videos) {
      await query(
        `INSERT INTO videos (
          id, title, title_telugu, description, youtube_url, thumbnail_url,
          category, duration, display_order, published, video_kind, active, copyright_status, verification_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 'UPLOAD', TRUE, 'OWNER', 'Verified')
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          title_telugu = EXCLUDED.title_telugu,
          description = EXCLUDED.description,
          youtube_url = EXCLUDED.youtube_url,
          thumbnail_url = EXCLUDED.thumbnail_url,
          category = EXCLUDED.category,
          display_order = EXCLUDED.display_order,
          published = TRUE,
          video_kind = 'UPLOAD',
          active = TRUE`,
        [
          v.id,
          v.title,
          v.title_telugu,
          v.description,
          v.youtube_url,
          v.thumbnail_url,
          v.category,
          v.duration,
          v.display_order
        ]
      );
    }

    const galCount = (await query('SELECT COUNT(*) FROM gallery')).rows[0].count;
    const vidCount = (await query('SELECT COUNT(*) FROM videos')).rows[0].count;
    const medCount = (await query('SELECT COUNT(*) FROM media_assets WHERE published = TRUE')).rows[0].count;

    return sendSuccess(res, {
      galleryCount: galCount,
      videosCount: vidCount,
      publishedMediaCount: medCount
    }, 'All assets synchronized and published successfully.');
  } catch (err) {
    console.error('[Sync Assets Error]', err);
    return sendError(res, 'Failed to synchronize assets: ' + err.message);
  }
}
