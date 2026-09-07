import { useEffect } from 'react';
import { TEMPLE } from '../config/temple.js';

/**
 * Lightweight, zero-dependency <head> manager for Technical SEO, GEO & AEO.
 * Dynamically updates:
 * - document.title
 * - meta[name="description"]
 * - meta[name="robots"]
 * - link[rel="canonical"]
 * - OpenGraph (og:title, og:description, og:url, og:image, og:site_name, og:type, og:locale)
 * - Twitter Cards (twitter:card, twitter:title, twitter:description, twitter:image)
 * - JSON-LD Schema.org structured data graph (<script id="temple-json-ld">)
 */
export default function SeoHead({
  title,
  description,
  canonicalPath = '',
  imageUrl,
  type = 'website',
  schemaGraph = null,
  breadcrumbs = null,
  noindex = false
}) {
  const fullCanonicalUrl = `${TEMPLE.canonicalDomain}${canonicalPath ? (canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`) : ''}`;
  const resolvedTitle = title
    ? (title.includes(TEMPLE.name) ? title : `${title} | ${TEMPLE.name}`)
    : `${TEMPLE.name} | Mungandapalem, Andhra Pradesh`;
  const resolvedDescription = description ||
    `Official portal of ${TEMPLE.name}, Mungandapalem, Munjavarapu Kottu, P. Gannavaram Mandal, East Godavari District, Andhra Pradesh. Temple timings, pooja details, events, festivals, history, and official announcements.`;
  const resolvedImage = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${TEMPLE.canonicalDomain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`)
    : `${TEMPLE.canonicalDomain}/assets/hero-banner.jpg`;

  useEffect(() => {
    // 1. Page Title
    document.title = resolvedTitle;

    // Helper to get or create meta tag
    const setMetaTag = (attrName, attrValue, content) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', resolvedDescription);
    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // 3. Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', fullCanonicalUrl);

    // 4. OpenGraph Tags
    setMetaTag('property', 'og:title', resolvedTitle);
    setMetaTag('property', 'og:description', resolvedDescription);
    setMetaTag('property', 'og:url', fullCanonicalUrl);
    setMetaTag('property', 'og:image', resolvedImage);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:site_name', TEMPLE.name);
    setMetaTag('property', 'og:locale', 'en_IN');
    setMetaTag('property', 'og:locale:alternate', 'te_IN');

    // 5. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', resolvedTitle);
    setMetaTag('name', 'twitter:description', resolvedDescription);
    setMetaTag('name', 'twitter:image', resolvedImage);

    // 6. JSON-LD Structured Data
    // Assemble complete Schema.org graph
    const baseTempleEntity = {
      '@type': 'HinduTemple',
      '@id': TEMPLE.entityId,
      name: TEMPLE.name,
      alternateName: TEMPLE.alternateName,
      url: TEMPLE.canonicalDomain,
      image: `${TEMPLE.canonicalDomain}/assets/hero-banner.jpg`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: TEMPLE.address.line1,
        addressLocality: TEMPLE.address.city,
        addressRegion: TEMPLE.address.state,
        postalCode: TEMPLE.address.pincode,
        addressCountry: 'IN'
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: TEMPLE.timings.morning.open,
          closes: TEMPLE.timings.morning.close
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: TEMPLE.timings.evening.open,
          closes: TEMPLE.timings.evening.close
        }
      ]
    };

    const baseWebSiteEntity = {
      '@type': 'WebSite',
      '@id': `${TEMPLE.canonicalDomain}/#website`,
      url: TEMPLE.canonicalDomain,
      name: TEMPLE.name,
      alternateName: TEMPLE.alternateName,
      publisher: { '@id': TEMPLE.entityId },
      inLanguage: ['en-IN', 'te-IN']
    };

    const graph = [baseTempleEntity, baseWebSiteEntity];

    if (breadcrumbs && breadcrumbs.length > 1) {
      graph.push({
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: b.name,
          item: b.url ? (b.url.startsWith('http') ? b.url : `${TEMPLE.canonicalDomain}${b.url}`) : fullCanonicalUrl
        }))
      });
    }

    if (schemaGraph) {
      if (Array.isArray(schemaGraph)) {
        graph.push(...schemaGraph);
      } else if (typeof schemaGraph === 'object') {
        graph.push(schemaGraph);
      }
    }

    let scriptTag = document.getElementById('temple-json-ld');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'temple-json-ld';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graph
    });

    return () => {
      // Cleanup on unmount if needed
    };
  }, [resolvedTitle, resolvedDescription, fullCanonicalUrl, resolvedImage, type, schemaGraph, breadcrumbs, noindex]);

  return null;
}
