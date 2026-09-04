import React from 'react';
import Icon from './Icon.jsx';

/**
 * Loading, empty and error states.
 *
 * Every screen that fetches data uses these three so a devotee never meets a
 * blank white page. The empty state explains what will appear and, where it
 * helps, what to do next; it never fills the gap with invented sample content.
 */

/**
 * Skeleton placeholders that mirror the shape of the content being loaded,
 * so the layout does not jump when real data arrives.
 */
export function LoadingState({ variant = 'cards', count = 3, label = 'Loading…' }) {
  return (
    <div className="state-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className={`skeleton-grid skeleton-grid-${variant}`} aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-block skeleton-media" />
            <div className="skeleton-line skeleton-line-title" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line-short" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shown when a request succeeded but there is nothing to display yet.
 * The temple is new to this system, so most sections start here.
 */
export function EmptyState({
  icon = 'info',
  title = 'Nothing to show yet',
  message = '',
  action = null
}) {
  return (
    <div className="state-empty">
      <span className="state-icon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="state-title">{title}</h3>
      {message ? <p className="state-message">{message}</p> : null}
      {action}
    </div>
  );
}

/**
 * Shown when a request failed. Carries a retry affordance whenever the caller
 * can retry, and never surfaces raw server or database errors.
 */
export function ErrorState({
  title = 'Unable to load this section',
  message = 'Please check your connection and try again.',
  onRetry = null
}) {
  return (
    <div className="state-error" role="alert">
      <span className="state-icon state-icon-error" aria-hidden="true">
        <Icon name="alert" size={26} />
      </span>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

/**
 * Convenience wrapper: pick the right state for a request, or render children.
 * Keeps the four-way branch out of every page.
 */
export function AsyncSection({
  loading,
  error,
  isEmpty,
  onRetry,
  loadingProps = {},
  emptyProps = {},
  errorProps = {},
  children
}) {
  if (loading) return <LoadingState {...loadingProps} />;
  if (error) return <ErrorState onRetry={onRetry} {...errorProps} />;
  if (isEmpty) return <EmptyState {...emptyProps} />;
  return children;
}
