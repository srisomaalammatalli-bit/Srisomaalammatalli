/**
 * /api/seo
 *
 * Unified SEO metadata and schema graph generator.
 * Returns canonical metadata, OpenGraph tags, and JSON-LD structured data (@graph)
 * grounded exclusively in verified database records and canonical constants.
 */

import { query } from '../_lib/db.js';
import { sendSuccess, sendError } from '../_lib/response.js';

const CANONICAL_DOMAIN = 'https://srisomaalammatalli.in';
const TEMPLE_ENTITY_ID = `${CANONICAL_DOMAIN}/#temple`;
const WEBSITE_ENTITY_ID = `${CANONICAL_DOMAIN}/#website`;

export default async function seoHandler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  try {
    const rawPath = req.query?.path || '/';
    const cleanPath = '/' + rawPath.replace(/^\/+/, '').replace(/\/+$/, '');

    // Fetch canonical temple settings
    const settingsRes = await query(
      "SELECT key, value FROM settings WHERE key IN ('temple_name', 'temple_name_alt', 'temple_name_telugu', 'temple_address', 'temple_pincode', 'temple_phone', 'temple_email', 'social_maps_url', 'seo_default_title', 'seo_default_description', 'default_og_image')"
    ).catch(() => ({ rows: [] }));

    const dbSettings = {};
    for (const r of settingsRes.rows) {
      try {
        dbSettings[r.key] = JSON.parse(r.value);
      } catch {
        dbSettings[r.key] = r.value;
      }
    }

    const templeName = dbSettings.temple_name || 'Srisomaalammatalli Temple';
    const templeAltName = dbSettings.temple_name_alt || 'Sri Somalamma Talli Temple';
    const templeTeluguName = dbSettings.temple_name_telugu || 'శ్రీ సోమాలమ్మ తల్లి దేవాలయం';
    const defaultTitle = dbSettings.seo_default_title || `${templeName} | Official Website`;
    const defaultDescription =
      dbSettings.seo_default_description ||
      `Official portal of ${templeName}, Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh. Temple timings, pooja details, events, festivals, history, and official announcements.`;
    const defaultImage = dbSettings.default_og_image || '/assets/hero-banner.jpg';

    // Base HinduTemple Entity Schema
    const templeSchema = {
      '@type': 'HinduTemple',
      '@id': TEMPLE_ENTITY_ID,
      name: templeName,
      alternateName: templeAltName,
      url: CANONICAL_DOMAIN,
      image: `${CANONICAL_DOMAIN}${defaultImage}`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Mungandapalem, Munjavarapu Kottu',
        addressLocality: 'P. Gannavaram Mandal',
        addressRegion: 'Andhra Pradesh',
        addressCountry: 'IN',
        postalCode: '533214'
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
          ],
          opens: '06:30',
          closes: '11:30'
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
          ],
          opens: '16:30',
          closes: '20:25'
        }
      ]
    };

    // If verified phone/email are provided, include them; never fabricate
    if (dbSettings.temple_phone && dbSettings.temple_phone.trim()) {
      templeSchema.telephone = dbSettings.temple_phone.trim();
    }
    if (dbSettings.temple_email && dbSettings.temple_email.trim()) {
      templeSchema.email = dbSettings.temple_email.trim();
    }
    if (dbSettings.social_maps_url && dbSettings.social_maps_url.trim()) {
      templeSchema.hasMap = dbSettings.social_maps_url.trim();
    }

    // Base WebSite Schema
    const websiteSchema = {
      '@type': 'WebSite',
      '@id': WEBSITE_ENTITY_ID,
      url: CANONICAL_DOMAIN,
      name: templeName,
      publisher: { '@id': TEMPLE_ENTITY_ID },
      inLanguage: ['en-IN', 'te-IN']
    };

    const graph = [templeSchema, websiteSchema];
    let pageTitle = defaultTitle;
    let pageDescription = defaultDescription;
    let pageImage = defaultImage;
    const breadcrumbItems = [
      { name: 'Home', url: `${CANONICAL_DOMAIN}/` }
    ];

    // Check path for specific detail or listing pages
    if (cleanPath === '/' || cleanPath === '') {
      pageTitle = `${templeName} | Mungandapalem, Andhra Pradesh`;
      pageDescription = defaultDescription;
    } else if (cleanPath === '/history') {
      pageTitle = `Temple History & Sthala Puranam | ${templeName}`;
      pageDescription = `Discover the sacred history, sthala puranam, and spiritual significance of ${templeName} in Mungandapalem, Andhra Pradesh.`;
      breadcrumbItems.push({ name: 'History', url: `${CANONICAL_DOMAIN}/history` });
    } else if (cleanPath === '/timings') {
      pageTitle = `Darshan & Temple Timings | ${templeName}`;
      pageDescription = `Official daily darshan timings for ${templeName}: Morning 06:30 AM to 11:30 AM, Evening 04:30 PM to 08:25 PM. Open all days.`;
      breadcrumbItems.push({ name: 'Timings', url: `${CANONICAL_DOMAIN}/timings` });
    } else if (cleanPath === '/poojas') {
      pageTitle = `Daily Poojas & Sevas | ${templeName}`;
      pageDescription = `Explore poojas, sevas, and sacred offerings performed at ${templeName}. Detailed pooja timings, procedures, and booking information.`;
      breadcrumbItems.push({ name: 'Poojas', url: `${CANONICAL_DOMAIN}/poojas` });
    } else if (cleanPath.startsWith('/poojas/')) {
      const slug = cleanPath.replace('/poojas/', '');
      breadcrumbItems.push({ name: 'Poojas', url: `${CANONICAL_DOMAIN}/poojas` });

      const poojaRes = await query(
        'SELECT id, name, name_telugu, slug, description, price_paise, pooja_time, duration_minutes, image_url, seo_title, seo_description FROM poojas WHERE slug = $1 AND published = TRUE LIMIT 1',
        [slug]
      ).catch(() => ({ rows: [] }));

      if (poojaRes.rows.length) {
        const p = poojaRes.rows[0];
        pageTitle = p.seo_title || `${p.name} | ${templeName}`;
        pageDescription = p.seo_description || p.description || `Details and timings for ${p.name} at ${templeName}.`;
        if (p.image_url) pageImage = p.image_url;

        breadcrumbItems.push({ name: p.name, url: `${CANONICAL_DOMAIN}/poojas/${p.slug}` });

        const serviceSchema = {
          '@type': 'Service',
          '@id': `${CANONICAL_DOMAIN}/poojas/${p.slug}#service`,
          name: p.name,
          description: p.description || pageDescription,
          provider: { '@id': TEMPLE_ENTITY_ID }
        };

        if (p.price_paise !== null && p.price_paise !== undefined && p.price_paise > 0) {
          serviceSchema.offers = {
            '@type': 'Offer',
            price: (p.price_paise / 100).toFixed(2),
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock'
          };
        }
        graph.push(serviceSchema);
      }
    } else if (cleanPath === '/events') {
      pageTitle = `Upcoming Events & Celebrations | ${templeName}`;
      pageDescription = `Stay updated with upcoming religious events, special utsavams, and sacred ceremonies at ${templeName}.`;
      breadcrumbItems.push({ name: 'Events', url: `${CANONICAL_DOMAIN}/events` });
    } else if (cleanPath.startsWith('/events/')) {
      const slug = cleanPath.replace('/events/', '');
      breadcrumbItems.push({ name: 'Events', url: `${CANONICAL_DOMAIN}/events` });

      const eventRes = await query(
        'SELECT id, title, slug, description, event_date, start_time, end_time, location, image_url, seo_title, seo_description FROM events WHERE slug = $1 AND published = TRUE LIMIT 1',
        [slug]
      ).catch(() => ({ rows: [] }));

      if (eventRes.rows.length) {
        const ev = eventRes.rows[0];
        pageTitle = ev.seo_title || `${ev.title} | ${templeName}`;
        pageDescription = ev.seo_description || ev.description || `Event details for ${ev.title} at ${templeName}.`;
        if (ev.image_url) pageImage = ev.image_url;

        breadcrumbItems.push({ name: ev.title, url: `${CANONICAL_DOMAIN}/events/${ev.slug}` });

        const eventSchema = {
          '@type': 'Event',
          '@id': `${CANONICAL_DOMAIN}/events/${ev.slug}#event`,
          name: ev.title,
          description: ev.description || pageDescription,
          startDate: ev.event_date ? `${ev.event_date}${ev.start_time ? `T${ev.start_time}` : ''}` : undefined,
          endDate: ev.event_date && ev.end_time ? `${ev.event_date}T${ev.end_time}` : undefined,
          organizer: { '@id': TEMPLE_ENTITY_ID },
          location: { '@id': TEMPLE_ENTITY_ID }
        };
        graph.push(eventSchema);
      }
    } else if (cleanPath === '/festivals') {
      pageTitle = `Temple Festivals & Annual Jathara | ${templeName}`;
      pageDescription = `Experience the grand annual Jathara and traditional festivals celebrated at ${templeName}, Mungandapalem.`;
      breadcrumbItems.push({ name: 'Festivals', url: `${CANONICAL_DOMAIN}/festivals` });
    } else if (cleanPath.startsWith('/festivals/')) {
      const slug = cleanPath.replace('/festivals/', '');
      breadcrumbItems.push({ name: 'Festivals', url: `${CANONICAL_DOMAIN}/festivals` });

      const festRes = await query(
        'SELECT id, name, slug, description, start_date, end_date, seo_title, seo_description, featured_image FROM temple_festivals WHERE slug = $1 AND published = TRUE LIMIT 1',
        [slug]
      ).catch(() => ({ rows: [] }));

      if (festRes.rows.length) {
        const f = festRes.rows[0];
        pageTitle = f.seo_title || `${f.name} Festival | ${templeName}`;
        pageDescription = f.seo_description || f.description || `Festival details for ${f.name} at ${templeName}.`;
        if (f.featured_image) pageImage = f.featured_image;

        breadcrumbItems.push({ name: f.name, url: `${CANONICAL_DOMAIN}/festivals/${f.slug}` });

        const festSchema = {
          '@type': 'Festival',
          '@id': `${CANONICAL_DOMAIN}/festivals/${f.slug}#festival`,
          name: f.name,
          description: f.description || pageDescription,
          startDate: f.start_date,
          endDate: f.end_date,
          location: { '@id': TEMPLE_ENTITY_ID }
        };
        graph.push(festSchema);
      }
    } else if (cleanPath === '/gallery') {
      pageTitle = `Photo Gallery | ${templeName}`;
      pageDescription = `Sacred photos of ${templeName}, darshan alankarams, deity idols, and temple festivals.`;
      breadcrumbItems.push({ name: 'Gallery', url: `${CANONICAL_DOMAIN}/gallery` });
    } else if (cleanPath === '/videos') {
      pageTitle = `Video Gallery & Darshan | ${templeName}`;
      pageDescription = `Watch holy darshan videos, festival processions, and devotional chanting from ${templeName}.`;
      breadcrumbItems.push({ name: 'Videos', url: `${CANONICAL_DOMAIN}/videos` });
    } else if (cleanPath === '/contact') {
      pageTitle = `Contact & Location | ${templeName}`;
      pageDescription = `Location and directions to ${templeName}, Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh. PIN: 533214.`;
      breadcrumbItems.push({ name: 'Contact', url: `${CANONICAL_DOMAIN}/contact` });
    } else if (cleanPath === '/donate') {
      pageTitle = `Online Donations & Nitya Annadanam | ${templeName}`;
      pageDescription = `Support ${templeName} through verified digital donations. Contribution details and temple trust development sevas.`;
      breadcrumbItems.push({ name: 'Donate', url: `${CANONICAL_DOMAIN}/donate` });
    }

    // Add BreadcrumbList Schema if more than 1 item
    if (breadcrumbItems.length > 1) {
      const breadcrumbSchema = {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: item.name,
          item: item.url
        }))
      };
      graph.push(breadcrumbSchema);
    }

    const payload = {
      title: pageTitle,
      description: pageDescription,
      canonicalUrl: `${CANONICAL_DOMAIN}${cleanPath === '/' ? '' : cleanPath}`,
      imageUrl: pageImage.startsWith('http') ? pageImage : `${CANONICAL_DOMAIN}${pageImage}`,
      templeName,
      templeAltName,
      templeTeluguName,
      breadcrumbs: breadcrumbItems,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': graph
      }
    };

    return sendSuccess(res, payload);
  } catch (err) {
    console.error('[SEO Resolver Error]', err);
    return sendError(res, 'Failed to resolve SEO metadata.');
  }
}
