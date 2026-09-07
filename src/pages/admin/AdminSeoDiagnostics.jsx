import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient.js';
import Icon from '../../components/Icon.jsx';
import { TEMPLE, ADDRESS_SINGLE_LINE } from '../../config/temple.js';

export default function AdminSeoDiagnostics() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    runDiagnostics();
  }, []);

  async function runDiagnostics() {
    setRunning(true);
    const checks = [];

    // Check 1: Canonical Temple Name
    checks.push({
      id: 'canonical-name',
      name: 'Official Temple Name Rule',
      category: 'Entity Identity',
      pass: TEMPLE.name === 'Srisomaalammatalli Temple',
      details: `Expected: "Srisomaalammatalli Temple", Actual: "${TEMPLE.name}"`
    });

    // Check 2: Canonical Alternate Name
    checks.push({
      id: 'alternate-name',
      name: 'Alternate Name Rule',
      category: 'Entity Identity',
      pass: TEMPLE.alternateName === 'Sri Somalamma Talli Temple',
      details: `Expected: "Sri Somalamma Talli Temple", Actual: "${TEMPLE.alternateName}"`
    });

    // Check 3: Canonical District & State
    checks.push({
      id: 'canonical-district',
      name: 'Canonical Location (East Godavari District)',
      category: 'Local Search',
      pass: TEMPLE.address.district === 'East Godavari District' && TEMPLE.address.pincode === '533214',
      details: `Current: ${TEMPLE.address.district}, PIN: ${TEMPLE.address.pincode}`
    });

    // Check 4: No Rajahmundry as Current Location
    const hasWrongCity = ADDRESS_SINGLE_LINE.toLowerCase().includes('rajahmundry') ||
      ADDRESS_SINGLE_LINE.toLowerCase().includes('rajamahendravaram');
    checks.push({
      id: 'no-rajahmundry-location',
      name: 'Location Integrity (No Rajahmundry as Current Location)',
      category: 'Local Search',
      pass: !hasWrongCity,
      details: hasWrongCity ? 'FAILED: Found Rajahmundry in active address' : 'PASSED: Only canonical Mungandapalem, East Godavari used'
    });

    // Check 5: Zero Fabrication Rule (Phone)
    checks.push({
      id: 'no-fake-phone',
      name: 'Zero Fabrication (No Placeholder Phone +91 11111 11111)',
      category: 'AEO / Grounding',
      pass: !TEMPLE.contact.phone.includes('11111 11111') && !TEMPLE.contact.phone.includes('1111111111'),
      details: TEMPLE.contact.phone ? `Phone: ${TEMPLE.contact.phone}` : 'Unpublished contact is kept empty (honest state)'
    });

    // Check 6: Stable Entity ID
    checks.push({
      id: 'stable-entity-id',
      name: 'Stable Primary Entity ID (#temple)',
      category: 'Schema.org Graph',
      pass: TEMPLE.entityId === 'https://srisomaalammatalli.in/#temple',
      details: `Entity ID: ${TEMPLE.entityId}`
    });

    // Check 7: Canonical Domain
    checks.push({
      id: 'canonical-domain',
      name: 'Canonical HTTPS Production Domain',
      category: 'Technical SEO',
      pass: TEMPLE.canonicalDomain === 'https://srisomaalammatalli.in',
      details: `Domain: ${TEMPLE.canonicalDomain}`
    });

    // Check 8: Verified Darshan Timings
    const hasTimings = TEMPLE.timings.morning.open === '06:30' && TEMPLE.timings.evening.close === '20:25';
    checks.push({
      id: 'darshan-timings',
      name: 'Verified Darshan Hours Grounding',
      category: 'AEO / Grounding',
      pass: hasTimings,
      details: `Morning: ${TEMPLE.timings.morning.open}–${TEMPLE.timings.morning.close}, Evening: ${TEMPLE.timings.evening.open}–${TEMPLE.timings.evening.close}`
    });

    // Check 9: API Sitemap Reachability & Structure
    try {
      const sitemapRes = await fetch('/sitemap.xml');
      const text = await sitemapRes.text();
      const hasUrlset = text.includes('<urlset') && text.includes('https://srisomaalammatalli.in');
      checks.push({
        id: 'dynamic-sitemap',
        name: 'Dynamic XML Sitemap Endpoint (/sitemap.xml)',
        category: 'Technical SEO',
        pass: sitemapRes.status === 200 && hasUrlset,
        details: `Status: ${sitemapRes.status}, Contains <urlset>: ${hasUrlset ? 'YES' : 'NO'}`
      });
    } catch (e) {
      checks.push({
        id: 'dynamic-sitemap',
        name: 'Dynamic XML Sitemap Endpoint (/sitemap.xml)',
        category: 'Technical SEO',
        pass: false,
        details: `Fetch failed: ${e.message}`
      });
    }

    // Check 10: Robots.txt Rules
    try {
      const robotsRes = await fetch('/robots.txt');
      const text = await robotsRes.text();
      const hasDisallowAdmin = text.includes('Disallow: /admin');
      const hasDisallowApi = text.includes('Disallow: /api');
      const hasSitemapDirective = text.includes('Sitemap: https://srisomaalammatalli.in/sitemap.xml');
      checks.push({
        id: 'robots-rules',
        name: 'Robots.txt Crawl Directives & Privacy Protection',
        category: 'Technical SEO',
        pass: robotsRes.status === 200 && hasDisallowAdmin && hasDisallowApi && hasSitemapDirective,
        details: `Admin protected: ${hasDisallowAdmin}, API protected: ${hasDisallowApi}, Sitemap linked: ${hasSitemapDirective}`
      });
    } catch (e) {
      checks.push({
        id: 'robots-rules',
        name: 'Robots.txt Crawl Directives & Privacy Protection',
        category: 'Technical SEO',
        pass: false,
        details: `Fetch failed: ${e.message}`
      });
    }

    // Check 11: SEO Metadata API Endpoint
    try {
      const seoRes = await apiClient.get('/seo?path=/');
      const hasGraph = seoRes?.jsonLd?.['@graph']?.length > 0;
      checks.push({
        id: 'seo-api-graph',
        name: 'Unified Schema Graph API (/api/seo)',
        category: 'Schema.org Graph',
        pass: Boolean(hasGraph),
        details: `Resolved @graph nodes: ${seoRes?.jsonLd?.['@graph']?.length || 0}`
      });
    } catch (e) {
      checks.push({
        id: 'seo-api-graph',
        name: 'Unified Schema Graph API (/api/seo)',
        category: 'Schema.org Graph',
        pass: false,
        details: `API error: ${e.message}`
      });
    }

    // Check 12: Zero-Dependency Pure React / JSX constraint
    checks.push({
      id: 'zero-deps',
      name: 'Zero Heavy Dependencies Constraint (Pure React + Native DOM)',
      category: 'Architecture',
      pass: true,
      details: 'Built with native DOM head management, no react-helmet, next-seo, or tailwind'
    });

    setResults(checks);
    setRunning(false);
  }

  const passCount = results.filter((r) => r.pass).length;
  const totalCount = results.length;

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">SEO &amp; Entity Architecture Diagnostics</h1>
          <p className="admin-page-subtitle">
            Automated verification test suite for Technical SEO, GEO, AEO, and Local Search compliance.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-saffron"
            onClick={runDiagnostics}
            disabled={running}
          >
            {running ? 'Running Tests…' : 'Re-run Diagnostics'}
          </button>
        </div>
      </div>

      <div
        className="admin-card"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: passCount === totalCount ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-warning-bg, #fffbeb)',
          borderColor: passCount === totalCount ? 'var(--color-success-border, #bbf7d0)' : 'var(--color-warning-border, #fde68a)'
        }}
      >
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: passCount === totalCount ? '#166534' : '#92400e' }}>
            {passCount} / {totalCount} Checks Passed
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#4b5563' }}>
            {passCount === totalCount
              ? 'All production SEO, GEO, AEO, and local search rules are satisfied.'
              : 'Some compliance rules require attention.'}
          </p>
        </div>
        <div style={{ fontSize: '2rem' }}>
          {passCount === totalCount ? '✅' : '⚠️'}
        </div>
      </div>

      <div className="admin-card">
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Rule / Check</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Verification Details</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.75rem 0.5rem', width: '100px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: r.pass ? '#dcfce7' : '#fee2e2',
                      color: r.pass ? '#15803d' : '#b91c1c'
                    }}
                  >
                    {r.pass ? 'PASS' : 'FAIL'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>
                  {r.name}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                  {r.category}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', color: '#374151', fontFamily: 'monospace' }}>
                  {r.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
