import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient.js';
import { adminErrorMessage } from '../services/adminMessages.js';
import { AsyncSection } from './States.jsx';
import SourceBadge from './SourceBadge.jsx';

/**
 * Shared scaffolding for the temple archive admin screens.
 *
 * History, claims, inscriptions and festival records differ only in their
 * fields: all four list records, open a form, save through the same
 * authenticated API and confirm before deleting. Rather than repeat that four
 * times, each screen declares its fields and this renders them.
 *
 * It introduces no new design vocabulary. Buttons, inputs, tables and badges
 * are the existing `btn`, `input-field`, `input-label`, `data-table` and
 * `badge-*` classes from global.css, and loading, error and empty states come
 * from the existing AsyncSection.
 */

export const SOURCE_TYPES = [
  'Primary Source',
  'Government Record',
  'Newspaper',
  'Book',
  'Academic Source',
  'Local Historical Source',
  'Oral History',
  'Video',
  'Community Source',
  'User Submitted',
  'Unverified'
];

export const VERIFICATION_STATUSES = [
  'Verified',
  'Source-backed',
  'Partially Documented',
  'Oral Tradition',
  'Needs Verification',
  'Disputed'
];

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px'
};

const dialogStyle = {
  background: '#fff',
  borderRadius: '16px',
  maxWidth: '720px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '28px'
};

/** Build the blank form state a "new record" starts from. */
function emptyDraft(fields) {
  const draft = {};
  for (const field of fields) {
    draft[field.name] = field.type === 'checkbox' ? Boolean(field.default) : field.default ?? '';
  }
  return draft;
}

/** Map a database row back onto the form's request-key names. */
function draftFromRecord(fields, record) {
  const draft = {};
  for (const field of fields) {
    const value = record[field.column];
    if (field.type === 'checkbox') {
      draft[field.name] = Boolean(value);
      continue;
    }
    if (value === null || value === undefined) {
      draft[field.name] = '';
      continue;
    }
    // The mirror of toRequest: a price stored as paise is shown as rupees.
    draft[field.name] = field.fromRecord ? field.fromRecord(value) : String(value);
  }
  return draft;
}

export default function AdminRecordScreen({
  title,
  description,
  endpoint,
  fields,
  columns,
  addLabel = '+ Add record',
  emptyTitle = 'Nothing recorded yet.',
  emptyMessage,
  deletePrompt = 'Delete this record? This cannot be undone.',
  filters = null,
  filterRecord = null,
  extraRowActions = null,
  listTransform = null,
  // Called after this screen's records change, so a page showing two related
  // screens can refresh the other one — adding a gallery category, say, must
  // make it selectable on the photograph form without a page reload.
  onChanged = null
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState(filters ? filters[0].key : null);

  const [editing, setEditing] = useState(null); // null | 'new' | record id
  const [draft, setDraft] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiClient.get(endpoint);
      const items = data?.items || [];
      setRecords(listTransform ? listTransform(items) : items);
    } catch {
      setError(true);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, listTransform]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    if (!filters || !filterRecord || activeFilter === null) return records;
    return records.filter((r) => filterRecord(r, activeFilter));
  }, [records, filters, filterRecord, activeFilter]);

  function openNew() {
    setDraft(emptyDraft(fields));
    setEditing('new');
    setDirty(false);
    setFormError('');
  }

  function openEdit(record) {
    setDraft(draftFromRecord(fields, record));
    setEditing(record.id);
    setDirty(false);
    setFormError('');
  }

  function closeForm() {
    // Unsaved work is easy to lose by reflex, so it is confirmed rather than
    // silently discarded.
    if (dirty && !window.confirm('Discard the changes you have made?')) return;
    setEditing(null);
    setDraft({});
    setDirty(false);
    setFormError('');
  }

  function setField(name, value) {
    setDraft((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    // A record with no substance must not reach the public site, so the
    // required fields are checked before the request is made.
    for (const field of fields) {
      if (field.required && !String(draft[field.name] ?? '').trim()) {
        setFormError(`${field.label} is required.`);
        return;
      }
    }

    // Blank optional values are dropped so an untouched field is left alone
    // rather than being written as an empty string.
    const body = {};
    for (const field of fields) {
      const value = draft[field.name];
      if (field.type === 'checkbox') {
        body[field.name] = Boolean(value);
      } else if (String(value ?? '').trim() !== '') {
        // A field may store something different from what it shows. A price
        // is the case that needs it: an administrator types rupees, the API
        // takes paise, and nobody should have to type 50100 to mean ₹501.
        body[field.name] = field.toRequest ? field.toRequest(value) : value;
      }
    }

    setSaving(true);
    try {
      if (editing === 'new') {
        await apiClient.post(endpoint, body);
        setNotice('Record created.');
      } else {
        await apiClient.put(endpoint, { ...body, id: editing });
        setNotice('Changes saved.');
      }
      setEditing(null);
      setDraft({});
      setDirty(false);
      await load();
      onChanged?.();
    } catch (err) {
      setFormError(adminErrorMessage(err, 'The record could not be saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    if (!window.confirm(deletePrompt)) return;
    try {
      await apiClient.delete(`${endpoint}/${encodeURIComponent(record.id)}`);
      setNotice('Record deleted.');
      await load();
      onChanged?.();
    } catch (err) {
      setNotice('');

      // The server refuses a removal that would affect other content and says
      // what it would affect. Telling the operator and then leaving them with
      // no way forward would be worse than not warning at all, so the warning
      // itself carries the choice.
      if (err?.code === 'DELETE_BLOCKED') {
        const proceed = window.confirm(
          `${adminErrorMessage(err)}\n\nPress OK to remove it anyway, or Cancel to keep it.`
        );
        if (!proceed) return;
        try {
          await apiClient.delete(`${endpoint}/${encodeURIComponent(record.id)}?force=1`);
          setNotice('Record deleted.');
          await load();
          onChanged?.();
        } catch (forcedErr) {
          window.alert(adminErrorMessage(forcedErr, 'The record could not be deleted.'));
        }
        return;
      }

      window.alert(adminErrorMessage(err, 'The record could not be deleted.'));
    }
  }

  /** Flip one boolean column without opening the form. */
  async function toggleFlag(record, requestKey, column) {
    try {
      await apiClient.put(endpoint, { id: record.id, [requestKey]: !record[column] });
      await load();
      onChanged?.();
    } catch (err) {
      window.alert(adminErrorMessage(err, 'The change could not be saved.'));
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              fontWeight: 700,
              margin: '0 0 4px',
              color: 'var(--color-maroon-primary)'
            }}
          >
            {title}
          </h1>
          {description ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '70ch' }}>
              {description}
            </div>
          ) : null}
        </div>

        <button type="button" onClick={openNew} className="btn btn-primary" style={{ fontSize: '13px' }}>
          {addLabel}
        </button>
      </div>

      {notice ? (
        <div
          role="status"
          style={{
            background: 'var(--color-gold-tint)',
            border: '1px solid var(--color-gold-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '18px',
            fontSize: '13px'
          }}
        >
          {notice}{' '}
          <button
            type="button"
            onClick={() => setNotice('')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', float: 'right' }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}

      {filters ? (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--color-border-subtle)',
                background:
                  activeFilter === f.key ? 'var(--color-maroon-primary)' : 'var(--color-ivory-surface)',
                color: activeFilter === f.key ? '#fff' : 'var(--color-text-primary)',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      <AsyncSection
        loading={loading}
        error={error}
        isEmpty={!loading && !error && visible.length === 0}
        onRetry={load}
        loadingProps={{ count: 4, variant: 'rows' }}
        emptyProps={{
          icon: 'book',
          title: records.length === 0 ? emptyTitle : 'Nothing matches this filter.',
          message:
            records.length === 0
              ? emptyMessage || 'Use the button above to add the first record.'
              : 'Choose another filter to see more records.'
        }}
        errorProps={{ title: 'Unable to load these records' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col">
                    {c.label}
                  </th>
                ))}
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((record) => (
                <tr key={record.id}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(record) : (record[c.key] ?? '—')}</td>
                  ))}
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                        onClick={() => openEdit(record)}
                      >
                        Edit
                      </button>
                      {extraRowActions
                        ? extraRowActions(record, { toggleFlag, reload: load }).map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              className="btn btn-outline"
                              style={{ fontSize: '12px', padding: '4px 10px' }}
                              onClick={action.onClick}
                            >
                              {action.label}
                            </button>
                          ))
                        : null}
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '12px', padding: '4px 10px', color: '#8A2020' }}
                        onClick={() => handleDelete(record)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncSection>

      {editing !== null ? (
        <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={title}>
          <div style={dialogStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px'
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--color-maroon-primary)'
                }}
              >
                {editing === 'new' ? `New ${title.toLowerCase()} record` : 'Edit record'}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {formError ? (
              <p
                role="alert"
                style={{
                  background: 'rgba(138,32,32,0.08)',
                  border: '1px solid rgba(138,32,32,0.3)',
                  color: '#8A2020',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                {formError}
              </p>
            ) : null}

            <form onSubmit={handleSubmit}>
              {fields.map((field) => (
                <div key={field.name} style={{ marginBottom: '14px' }}>
                  {field.type === 'checkbox' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(draft[field.name])}
                        onChange={(e) => setField(field.name, e.target.checked)}
                      />
                      {field.label}
                    </label>
                  ) : (
                    <>
                      <label className="input-label" htmlFor={`f-${field.name}`}>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          id={`f-${field.name}`}
                          className="input-field"
                          value={draft[field.name] ?? ''}
                          onChange={(e) => setField(field.name, e.target.value)}
                        >
                          {/* Options may be a fixed list, or a function so a
                              screen can offer choices loaded from the
                              database — gallery categories, for instance,
                              which the committee edits. */}
                          {(typeof field.options === 'function'
                            ? field.options()
                            : field.options || []
                          ).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          id={`f-${field.name}`}
                          className="input-field"
                          rows={field.rows || 4}
                          lang={field.lang}
                          placeholder={field.placeholder}
                          value={draft[field.name] ?? ''}
                          onChange={(e) => setField(field.name, e.target.value)}
                        />
                      ) : (
                        <input
                          id={`f-${field.name}`}
                          type={field.type || 'text'}
                          className="input-field"
                          lang={field.lang}
                          placeholder={field.placeholder}
                          value={draft[field.name] ?? ''}
                          onChange={(e) => setField(field.name, e.target.value)}
                        />
                      )}
                    </>
                  )}
                  {field.hint ? (
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                      {field.hint}
                    </p>
                  ) : null}
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save record'}
                </button>
                <button type="button" className="btn btn-outline" onClick={closeForm} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Status cell shared by every archive screen. */
export function StatusCell({ record }) {
  return (
    <SourceBadge
      status={record.verification_status}
      sourceType={record.source_type}
      sourceTitle={record.source_title}
      sourceDate={record.source_date}
    />
  );
}

/** Yes/no cell that says plainly when something is hidden from the public. */
export function VisibilityCell({ visible, hiddenLabel = 'Not publicly visible' }) {
  return visible ? (
    <span className="badge badge-success">Public</span>
  ) : (
    <span className="badge badge-warning">{hiddenLabel}</span>
  );
}
