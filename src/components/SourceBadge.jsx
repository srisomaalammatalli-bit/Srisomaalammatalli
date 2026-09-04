import React from 'react';

/**
 * Evidence badges.
 *
 * Every historical statement on the site carries one of these, so a reader
 * can tell documented history from remembered tradition without having to
 * parse careful wording. The visual weight is deliberately ordered: a
 * verified claim reads as settled, an unverified one reads as open. Nothing
 * here is styled to look more certain than it is — that is the single rule
 * this component exists to enforce.
 *
 * The vocabulary matches api/_lib/evidence.js and the CHECK constraints in
 * migration 005. An unrecognised status is labelled rather than dropped: a
 * claim showing no badge at all would read as fact.
 */

const STYLES = {
  Verified: { className: 'source-badge source-badge-verified', label: 'Verified' },
  'Source-backed': { className: 'source-badge source-badge-sourced', label: 'Source-backed' },
  'Partially Documented': {
    className: 'source-badge source-badge-partial',
    label: 'Partially documented'
  },
  'Oral Tradition': { className: 'source-badge source-badge-tradition', label: 'Local tradition' },
  'Needs Verification': {
    className: 'source-badge source-badge-unverified',
    label: 'Needs verification'
  },
  Disputed: { className: 'source-badge source-badge-disputed', label: 'Disputed' }
};

const FALLBACK = { className: 'source-badge source-badge-unverified', label: 'Needs verification' };

/**
 * What each status actually means, for the title attribute and the legend.
 * Spelled out because "Source-backed" and "Verified" are not the same thing
 * and the difference matters.
 */
export const STATUS_MEANING = {
  Verified: 'Confirmed against primary evidence.',
  'Source-backed': 'Reported by an identified source, but not confirmed against primary evidence.',
  'Partially Documented': 'Some documentation exists; the details are incomplete.',
  'Oral Tradition': 'Preserved in local memory and oral tradition rather than in written records.',
  'Needs Verification': 'Reported, but not yet checked against a primary source.',
  Disputed: 'Sources disagree, or the claim is contested.'
};

export default function SourceBadge({ status, sourceType, sourceTitle, sourceDate, className = '' }) {
  if (!status) return null;

  const style = STYLES[status] || FALLBACK;
  const meaning = STATUS_MEANING[status] || STATUS_MEANING['Needs Verification'];

  // The source itself, where one is named, so the badge answers "says who?"
  const attribution = [sourceType, sourceTitle].filter(Boolean).join(' · ');
  const year = sourceDate ? String(sourceDate).slice(0, 4) : null;

  return (
    <span className={`source-badge-group ${className}`.trim()}>
      <span className={style.className} title={meaning}>
        {style.label}
      </span>
      {attribution ? (
        <span className="source-badge-attribution">
          {attribution}
          {year ? ` (${year})` : ''}
        </span>
      ) : null}
    </span>
  );
}

/**
 * A legend explaining the badges.
 *
 * Shown once per page that uses them. Without it the labels are just
 * colours, and a reader cannot tell that "Source-backed" is a weaker claim
 * than "Verified".
 */
export function SourceBadgeLegend() {
  return (
    <div className="source-legend" role="note" aria-label="What the evidence labels mean">
      <p className="source-legend-title">How to read the labels on this page</p>
      <dl className="source-legend-list">
        {Object.entries(STATUS_MEANING).map(([status, meaning]) => {
          const style = STYLES[status] || FALLBACK;
          return (
            <div key={status} className="source-legend-row">
              <dt>
                <span className={style.className}>{style.label}</span>
              </dt>
              <dd>{meaning}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
