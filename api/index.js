/**
 * Unified Serverless API Gateway for Vercel.
 *
 * Consolidates all API endpoints into a single Serverless Function,
 * keeping the deployment within Vercel's Hobby tier (max 12 functions).
 */

import healthHandler from '../server/health.js';
import adminPaymentsHandler from '../server/admin/payments/index.js';
import announcementsHandler from '../server/announcements/index.js';
import auditHandler from '../server/audit/index.js';
import authLoginHandler from '../server/auth/login.js';
import authLogoutHandler from '../server/auth/logout.js';
import authSessionHandler from '../server/auth/session.js';
import committeeHandler from '../server/committee/index.js';
import donationsHandler from '../server/donations/index.js';
import enquiriesHandler from '../server/enquiries/index.js';
import eventsHandler from '../server/events/index.js';
import expensesHandler from '../server/expenses/index.js';
import financialRecordsHandler from '../server/financial-records/index.js';
import galleryHandler from '../server/gallery/index.js';
import galleryCategoriesHandler from '../server/gallery-categories/index.js';
import homepageSectionsHandler from '../server/homepage-sections/index.js';
import importantDatesHandler from '../server/important-dates/index.js';
import jatharaHandler from '../server/jathara/index.js';
import landChitHandler from '../server/land-chit/index.js';
import mediaHandler from '../server/media/index.js';
import mediaUploadHandler from '../server/media/upload/index.js';
import onlineDonationsHandler from '../server/online-donations/index.js';
import paymentsHandler from '../server/payments/index.js';
import poojaBookingsHandler from '../server/pooja-bookings/index.js';
import poojasHandler from '../server/poojas/index.js';
import reportsHandler from '../server/reports/index.js';
import settingsHandler from '../server/settings/index.js';
import templeClaimsHandler from '../server/temple/claims/index.js';
import templeFestivalsHandler from '../server/temple/festivals/index.js';
import templeHistoryHandler from '../server/temple/history/index.js';
import templeInscriptionsHandler from '../server/temple/inscriptions/index.js';
import templeSubmissionsHandler from '../server/temple/submissions/index.js';
import timingsHandler from '../server/timings/index.js';
import videosHandler from '../server/videos/index.js';
import mediaFileHandler from '../server/media/file/index.js';
import syncAssetsHandler from '../server/admin/sync-assets/index.js';

const ROUTE_TABLE = [
  { prefix: 'health', handler: healthHandler },
  { prefix: 'admin/sync-assets', handler: syncAssetsHandler },
  { prefix: 'admin/payments', handler: adminPaymentsHandler },
  { prefix: 'announcements', handler: announcementsHandler },
  { prefix: 'audit', handler: auditHandler },
  { prefix: 'auth/login', handler: authLoginHandler },
  { prefix: 'auth/logout', handler: authLogoutHandler },
  { prefix: 'auth/session', handler: authSessionHandler },
  { prefix: 'committee', handler: committeeHandler },
  { prefix: 'donations', handler: donationsHandler },
  { prefix: 'enquiries', handler: enquiriesHandler },
  { prefix: 'events', handler: eventsHandler },
  { prefix: 'expenses', handler: expensesHandler },
  { prefix: 'financial-records', handler: financialRecordsHandler },
  { prefix: 'gallery-categories', handler: galleryCategoriesHandler },
  { prefix: 'gallery', handler: galleryHandler },
  { prefix: 'homepage-sections', handler: homepageSectionsHandler },
  { prefix: 'important-dates', handler: importantDatesHandler },
  { prefix: 'jathara', handler: jatharaHandler },
  { prefix: 'land-chit', handler: landChitHandler },
  { prefix: 'media/upload', handler: mediaUploadHandler },
  { prefix: 'media/file', handler: mediaFileHandler },
  { prefix: 'media', handler: mediaHandler },
  { prefix: 'online-donations', handler: onlineDonationsHandler },
  { prefix: 'payments', handler: paymentsHandler },
  { prefix: 'pooja-bookings', handler: poojaBookingsHandler },
  { prefix: 'poojas', handler: poojasHandler },
  { prefix: 'reports', handler: reportsHandler },
  { prefix: 'settings', handler: settingsHandler },
  { prefix: 'temple/claims', handler: templeClaimsHandler },
  { prefix: 'temple/festivals', handler: templeFestivalsHandler },
  { prefix: 'temple/history', handler: templeHistoryHandler },
  { prefix: 'temple/inscriptions', handler: templeInscriptionsHandler },
  { prefix: 'temple/submissions', handler: templeSubmissionsHandler },
  { prefix: 'timings', handler: timingsHandler },
  { prefix: 'videos', handler: videosHandler }
];

export default async function handler(req, res) {
  const host = req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url, `http://${host}`);
  
  // Normalise path, e.g. "/api/events/ev_123" -> "events/ev_123"
  const pathname = parsedUrl.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  
  // Ensure req.query is populated from search parameters
  req.query = req.query || {};
  for (const [key, value] of parsedUrl.searchParams.entries()) {
    if (!req.query[key]) {
      req.query[key] = value;
    }
  }

  // Find matching route
  for (const route of ROUTE_TABLE) {
    if (pathname === route.prefix) {
      return route.handler(req, res);
    }
    if (pathname.startsWith(route.prefix + '/')) {
      const remainder = pathname.slice(route.prefix.length + 1);
      // If remainder is a single segment, treat it as the resource ID (e.g. /api/gallery/gal_123)
      if (remainder && !remainder.includes('/')) {
        req.query.id = remainder;
      }
      return route.handler(req, res);
    }
  }

  // Not found
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  return res.end(
    JSON.stringify({
      success: false,
      error: { code: 'NOT_FOUND', message: `API route not found: ${parsedUrl.pathname}` }
    })
  );
}
