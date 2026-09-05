import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from './layouts/PublicLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

// Public Pages
import HomePage from './pages/public/HomePage.jsx';
import EventsPage from './pages/public/EventsPage.jsx';
import GalleryPage from './pages/public/GalleryPage.jsx';
import VideosPage from './pages/public/VideosPage.jsx';
import ContactPage from './pages/public/ContactPage.jsx';
import DonateWizard from './pages/public/DonateWizard.jsx';
import PoojasPage from './pages/public/PoojasPage.jsx';

// The history pages carry the archive: timeline, sources, festival years.
// Split out so a devotee visiting the donation page does not download them.
const AboutPage = lazy(() => import('./pages/public/AboutPage.jsx'));
const HistoryPage = lazy(() => import('./pages/public/HistoryPage.jsx'));
const SourcesPage = lazy(() => import('./pages/public/SourcesPage.jsx'));
const SubmitHistoryPage = lazy(() => import('./pages/public/SubmitHistoryPage.jsx'));

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminDonations from './pages/admin/AdminDonations.jsx';
import AdminPayments from './pages/admin/AdminPayments.jsx';
import AdminIncome from './pages/admin/AdminIncome.jsx';
import AdminExpenses from './pages/admin/AdminExpenses.jsx';
import AdminLand from './pages/admin/AdminLand.jsx';
import AdminJathara from './pages/admin/AdminJathara.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminEvents from './pages/admin/AdminEvents.jsx';
import AdminGallery from './pages/admin/AdminGallery.jsx';
import AdminVideos from './pages/admin/AdminVideos.jsx';
import AdminDates from './pages/admin/AdminDates.jsx';
import AdminCommittee from './pages/admin/AdminCommittee.jsx';
import AdminAudit from './pages/admin/AdminAudit.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';

// Temple archive screens. Split out like the public history pages: an
// administrator recording a donation should not download the archive editor.
const AdminHistory = lazy(() => import('./pages/admin/AdminHistory.jsx'));
const AdminClaims = lazy(() => import('./pages/admin/AdminClaims.jsx'));
const AdminInscriptions = lazy(() => import('./pages/admin/AdminInscriptions.jsx'));
const AdminFestivals = lazy(() => import('./pages/admin/AdminFestivals.jsx'));
const AdminSubmissions = lazy(() => import('./pages/admin/AdminSubmissions.jsx'));
const AdminMedia = lazy(() => import('./pages/admin/AdminMedia.jsx'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements.jsx'));
const AdminPoojas = lazy(() => import('./pages/admin/AdminPoojas.jsx'));
const AdminHomepage = lazy(() => import('./pages/admin/AdminHomepage.jsx'));

/** Keeps the lazy admin routes from repeating the same fallback markup. */
function AdminChunk({ children }) {
  return <Suspense fallback={<div aria-busy="true" style={{ padding: '24px' }} />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      {/* Public Temple Devotee Website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/about"
          element={
            <Suspense fallback={<div className="page-main" aria-busy="true" />}>
              <AboutPage />
            </Suspense>
          }
        />
        <Route
          path="/history"
          element={
            <Suspense fallback={<div className="page-main" aria-busy="true" />}>
              <HistoryPage />
            </Suspense>
          }
        />
        <Route
          path="/history/contribute"
          element={
            <Suspense fallback={<div className="page-main" aria-busy="true" />}>
              <SubmitHistoryPage />
            </Suspense>
          }
        />
        <Route
          path="/history/sources"
          element={
            <Suspense fallback={<div className="page-main" aria-busy="true" />}>
              <SourcesPage />
            </Suspense>
          }
        />
        {/* Financial transparency is admin-only per committee policy; redirect public callers to home */}
        <Route path="/financial-transparency" element={<Navigate to="/" replace />} />
        <Route path="/transparency" element={<Navigate to="/" replace />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/donate" element={<DonateWizard />} />
        <Route path="/poojas" element={<PoojasPage />} />
      </Route>

      {/* Admin Login Route */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin Portal Protected Workspace */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="donations" element={<AdminDonations />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="income" element={<AdminIncome />} />
        <Route path="expenses" element={<AdminExpenses />} />
        <Route path="land-chit" element={<AdminLand />} />
        <Route path="jathara" element={<AdminJathara />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="videos" element={<AdminVideos />} />
        <Route path="important-dates" element={<AdminDates />} />
        <Route path="committee" element={<AdminCommittee />} />
        {/* Temple archive. Inside the same AdminLayout route, so the existing
            authentication guard covers them unchanged. */}
        <Route
          path="history"
          element={
            <AdminChunk>
              <AdminHistory />
            </AdminChunk>
          }
        />
        <Route
          path="claims"
          element={
            <AdminChunk>
              <AdminClaims />
            </AdminChunk>
          }
        />
        <Route
          path="inscriptions"
          element={
            <AdminChunk>
              <AdminInscriptions />
            </AdminChunk>
          }
        />
        <Route
          path="festivals"
          element={
            <AdminChunk>
              <AdminFestivals />
            </AdminChunk>
          }
        />
        <Route
          path="submissions"
          element={
            <AdminChunk>
              <AdminSubmissions />
            </AdminChunk>
          }
        />
        <Route
          path="media"
          element={
            <AdminChunk>
              <AdminMedia />
            </AdminChunk>
          }
        />
        <Route
          path="announcements"
          element={
            <AdminChunk>
              <AdminAnnouncements />
            </AdminChunk>
          }
        />
        <Route
          path="poojas"
          element={
            <AdminChunk>
              <AdminPoojas />
            </AdminChunk>
          }
        />
        <Route
          path="homepage"
          element={
            <AdminChunk>
              <AdminHomepage />
            </AdminChunk>
          }
        />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
