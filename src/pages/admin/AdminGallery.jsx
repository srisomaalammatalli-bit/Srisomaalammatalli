import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../services/apiClient.js';
import AdminRecordScreen, { VisibilityCell } from '../../components/AdminRecordScreen.jsx';

/**
 * The devotional gallery.
 *
 * Rebuilt on the shared admin scaffold: the previous version could only add
 * and delete, so correcting a caption meant deleting the photograph and
 * adding it again.
 *
 * Categories come from the Gallery Categories screen rather than a fixed
 * list in code, so a category the committee adds is immediately selectable
 * here. Deleting a category never deletes photographs — a picture keeps the
 * category name it was filed under.
 */

/** Categories the committee has defined, loaded when the screen mounts. */
let cachedCategories = [];

const FIELDS = [
  { name: 'title', column: 'title', label: 'Title', required: true },
  { name: 'titleTelugu', column: 'title_telugu', label: 'Title (Telugu)', lang: 'te' },
  {
    name: 'imageUrl',
    column: 'image_url',
    label: 'Photograph',
    required: true,
    placeholder: '/assets/… or https://…',
    hint: 'Paste the address of a picture from the Media Library.'
  },
  {
    name: 'category',
    column: 'category',
    label: 'Category',
    type: 'select',
    options: () => cachedCategories,
    hint: 'Managed under Gallery Categories.'
  },
  { name: 'description', column: 'description', label: 'Caption', type: 'textarea', rows: 3 },
  {
    name: 'captionTelugu',
    column: 'caption_telugu',
    label: 'Caption (Telugu)',
    type: 'textarea',
    rows: 3,
    lang: 'te'
  },
  {
    name: 'altText',
    column: 'alt_text',
    label: 'Alt text',
    hint: 'What is in the picture, for devotees using a screen reader.'
  },
  { name: 'displayOrder', column: 'display_order', label: 'Display order', default: '0' },
  { name: 'featured', column: 'featured', label: 'Featured', type: 'checkbox' },
  { name: 'published', column: 'published', label: 'Published', type: 'checkbox' }
];

const COLUMNS = [
  {
    key: 'title',
    label: 'Photograph',
    render: (r) => (
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {r.image_url ? (
          <img
            src={r.image_url}
            alt=""
            style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '6px' }}
          />
        ) : null}
        <div style={{ maxWidth: '28ch' }}>
          <strong>{r.title}</strong>
          {r.title_telugu ? (
            <div lang="te" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {r.title_telugu}
            </div>
          ) : null}
        </div>
      </div>
    )
  },
  {
    key: 'category',
    label: 'Category',
    render: (r) => (r.category ? <span className="badge badge-muted">{r.category}</span> : '—')
  },
  {
    key: 'published',
    label: 'Public',
    render: (r) => <VisibilityCell visible={r.published} hiddenLabel="Draft" />
  },
  { key: 'display_order', label: 'Order', render: (r) => r.display_order ?? 0 }
];

/** The categories themselves. The slug is derived by the API from the name. */
const CATEGORY_FIELDS = [
  { name: 'name', column: 'name', label: 'Category name', required: true },
  { name: 'nameTelugu', column: 'name_telugu', label: 'Category name (Telugu)', lang: 'te' },
  { name: 'description', column: 'description', label: 'Description', type: 'textarea', rows: 2 },
  { name: 'displayOrder', column: 'display_order', label: 'Order', type: 'number' },
  { name: 'published', column: 'published', label: 'Show on the public gallery', type: 'checkbox', default: true }
];

const CATEGORY_COLUMNS = [
  { key: 'name', label: 'Category', render: (r) => r.name },
  {
    key: 'name_telugu',
    label: 'Telugu',
    render: (r) => (r.name_telugu ? <span lang="te">{r.name_telugu}</span> : '—')
  },
  {
    key: 'published',
    label: 'Public',
    render: (r) => <VisibilityCell visible={r.published} hiddenLabel="Hidden" />
  },
  { key: 'display_order', label: 'Order', render: (r) => r.display_order ?? 0 }
];

export default function AdminGallery() {
  const [, setReady] = useState(0);

  // Loaded before the form is opened, so the category list is populated, and
  // again whenever the categories below change — otherwise a category just
  // added would not be selectable until the page was reloaded.
  const reloadCategories = useCallback(() => {
    apiClient
      .get('/gallery-categories')
      .then((data) => {
        cachedCategories = (data?.items || []).map((c) => c.name).filter(Boolean);
        setReady((n) => n + 1);
      })
      .catch(() => {
        cachedCategories = [];
        setReady((n) => n + 1);
      });
  }, []);

  useEffect(() => {
    reloadCategories();
  }, [reloadCategories]);

  return (
    <>
    <AdminRecordScreen
      title="Gallery"
      description="Photographs shown on the public gallery. A picture appears only once it is published."
      endpoint="/gallery"
      addLabel="+ Add photograph"
      fields={FIELDS}
      columns={COLUMNS}
      emptyTitle="No photographs yet."
      emptyMessage="Add a photograph from the Media Library to start the gallery."
      deletePrompt="Delete this photograph from the gallery? The image file itself is not deleted."
      extraRowActions={(record, { toggleFlag }) => [
        {
          label: record.published ? 'Unpublish' : 'Publish',
          onClick: () => toggleFlag(record, 'published', 'published')
        },
        {
          label: record.featured ? 'Unfeature' : 'Feature',
          onClick: () => toggleFlag(record, 'featured', 'featured')
        }
      ]}
    />

      {/* The categories themselves. The API has always supported these, but
          without a screen a committee member could not add "Kalyanam" or
          "Annadanam" without a developer — which is the one thing this admin
          portal exists to prevent. Removing a category never removes
          photographs; the server says how many are affected before it
          happens. */}
      <div style={{ marginTop: '2.5rem' }}>
        <AdminRecordScreen
          title="Gallery categories"
          description="The headings photographs are filed under. Adding one here makes it selectable above."
          endpoint="/gallery-categories"
          addLabel="+ Add category"
          fields={CATEGORY_FIELDS}
          columns={CATEGORY_COLUMNS}
          emptyTitle="No categories yet."
          emptyMessage="Add a category so photographs can be grouped on the public gallery."
          deletePrompt="Remove this category? Photographs filed under it are kept — they simply stop appearing under this heading."
          onChanged={reloadCategories}
          extraRowActions={(record, { toggleFlag }) => [
            {
              label: record.published ? 'Hide' : 'Show',
              onClick: () => toggleFlag(record, 'published', 'published')
            }
          ]}
        />
      </div>
    </>
  );
}
