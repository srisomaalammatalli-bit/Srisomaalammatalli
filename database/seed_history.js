/**
 * Historical content seeder.
 *
 * Separate from seed.js because the content here is *editorial*, not
 * structural: seed.js creates the roles and settings the application needs
 * in order to run, while this file writes the temple's history as supplied
 * by the temple administration.
 *
 * Every entry carries the source it rests on and a status saying how far it
 * can be trusted. That is the whole point of the source_type /
 * verification_status columns — a reader should be able to see the difference
 * between what is documented and what is remembered.
 *
 * An earlier version of this file described the Old Somalamma Temple at
 * Rajahmundry: the Raja Raja Narendra association, an 1911 renovation by the
 * Gopalapuram Zamindars, and Jatara years documented there. That is a
 * different and larger temple roughly 60 km away, and none of it was evidence
 * about this one, so it has been removed rather than left to be read as this
 * temple's past.
 *
 * What remains is deliberately thin, because that is what the record supports.
 * No published documentation of a Somalamma temple at Mungandapalem could be
 * found — not in the Endowments listings consulted, in news reporting, or in
 * temple directories. What IS documented is the place: the village, the
 * mandal, the 2022 district reorganisation and the delta it stands in. Those
 * are seeded with their sources; the temple's own history is seeded as an
 * open question for the committee to answer.
 *
 * Deliberately NOT seeded: phone numbers, email addresses, official temple
 * timings, donation account details, trustee names and any construction
 * date. Those must come from the temple administration through the admin
 * portal.
 *
 * Re-running is safe: rows are matched on a stable natural key and updated
 * rather than duplicated.
 *
 * Usage:  npm run seed:history
 */

import { loadEnv } from './env.js';

loadEnv();

const { query, closeConnections } = await import('../api/_lib/db.js');
const crypto = await import('node:crypto');

const newId = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;

/* ------------------------------------------------------------------ *
 * History entries (§44)
 * ------------------------------------------------------------------ */

const HISTORY = [
  {
    order: 1,
    period: 'The temple’s own history',
    title: 'Not yet documented',
    description:
      'No published record of this temple has been found: it does not appear in the Andhra Pradesh Endowments listings consulted, in news reporting, or in the temple directories searched. Its founding date, its builders and the origin of worship here are therefore not stated on this page. They are not unknown to the village — they are simply not yet written down. The temple committee can record them here, and devotees who hold old photographs, invitations or family memories are asked to contribute them.',
    sourceType: 'Unverified',
    sourceTitle: 'No published source located',
    verification: 'Needs Verification',
    featured: true
  },
  {
    order: 2,
    period: 'Mungandapalem',
    title: 'The village',
    description:
      'The temple stands at Mungandapalem, a revenue village of P. Gannavaram mandal. The mandal is administered from Patha Gannavaram and falls under the Kothapeta revenue division. Mungandapalem is listed among the village panchayats of the mandal in the district administration’s own records.',
    teluguDescription: 'ముంగండపాలెం, పి. గన్నవరం మండలం',
    sourceType: 'Government Record',
    sourceTitle: 'Village Panchayats, Dr. B. R. Ambedkar Konaseema District',
    sourceUrl:
      'https://konaseema.ap.gov.in/about-district/administrative-setup/village-panchayats/',
    verification: 'Source-backed'
  },
  {
    order: 3,
    period: '4 April 2022',
    yearStart: 2022,
    title: 'The district changed',
    description:
      'P. Gannavaram was part of East Godavari district until 4 April 2022, when Konaseema district was carved out of it. On 2 August 2022 the new district was officially named Dr. B. R. Ambedkar Konaseema district, with its headquarters at Amalapuram. Older documents and postal addresses connected with this temple may therefore still say East Godavari; both refer to the same place.',
    sourceType: 'Academic Source',
    sourceTitle: 'Konaseema district — Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Konaseema_district',
    verification: 'Source-backed'
  },
  {
    order: 4,
    period: 'Konaseema',
    title: 'Land between the two Godavaris',
    description:
      'The temple lies in Konaseema, the island tract of the Godavari delta held between the river’s two great branches, the Gautami and the Vasishtha, before they reach the Bay of Bengal. It is a landscape of paddy and coconut, and its villages have long kept their own shrines to the goddesses who guard them.',
    sourceType: 'Academic Source',
    sourceTitle: 'Konaseema district — Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Konaseema_district',
    verification: 'Source-backed'
  },
  {
    order: 5,
    period: 'Grama devata tradition',
    title: 'Somalamma among the village goddesses',
    description:
      'Somalamma — also called Somanalamma and Somanayaki Amma — is worshipped across Andhra Pradesh as a village goddess, and her temples are found through the Godavari districts and beyond. Devotees turn to her for relief in sickness and distress. Each such shrine belongs to the village that keeps it, and this account of the wider tradition should not be read as the history of this temple in particular, which remains to be recorded.',
    sourceType: 'Community Source',
    sourceTitle: 'Somalamma — Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Somalamma',
    verification: 'Partially Documented'
  }
];

/* ------------------------------------------------------------------ *
 * Claims register (§23)
 *
 * The register records what is NOT known as carefully as what is. Each entry
 * here is an open question about this temple, seeded so the gaps are visible
 * on the website rather than papered over with something borrowed.
 * ------------------------------------------------------------------ */

const CLAIMS = [
  {
    order: 1,
    claim: 'The year the temple was founded, and by whom.',
    claimType: 'Origin',
    description:
      'No source consulted records when worship began at this shrine or who established it. The committee and the village elders are the people who can answer this.',
    sourceType: 'Unverified',
    sourceTitle: 'No published source located',
    verification: 'Needs Verification',
    publicVisible: true
  },
  {
    order: 2,
    claim: 'The dates and programme of the annual Jatara at this temple.',
    claimType: 'Festival',
    description:
      'The temple’s festival calendar has not been published anywhere that could be found. Once the committee records the dates and the order of the rituals, they will appear on the festivals page.',
    sourceType: 'Unverified',
    sourceTitle: 'No published source located',
    verification: 'Needs Verification',
    publicVisible: true
  },
  {
    order: 3,
    claim: 'Whether the temple is registered with the Andhra Pradesh Endowments Department.',
    claimType: 'Administration',
    description:
      'No endowments registration for this temple was located. Nothing on this website claims any registration or trust status until the committee supplies the document.',
    sourceType: 'Unverified',
    sourceTitle: 'No published source located',
    verification: 'Needs Verification',
    publicVisible: true
  }
];

/* ------------------------------------------------------------------ *
 * Inscription record (§24)
 *
 * Created with no transcription. The reading is added once the stone has
 * actually been photographed and read; an invented transcription would be
 * indistinguishable from a real one later.
 * ------------------------------------------------------------------ */

// No inscription at this temple has been reported by any source that could be
// found. The array is deliberately empty rather than carrying a placeholder:
// an invented or borrowed inscription record would be indistinguishable from
// a real one once someone starts reading it as evidence.
const INSCRIPTIONS = [];

/* ------------------------------------------------------------------ *
 * Festival archive (§45, §10–§14)
 * ------------------------------------------------------------------ */

// The Jatara years previously seeded here documented the Rajahmundry temple's
// festivals, not this one's. This temple certainly holds its own Jatara — the
// village knows when — but no published record of it was found, so nothing is
// seeded. The committee adds each year through the admin portal.
const FESTIVALS = [];

/* ------------------------------------------------------------------ *
 * Settings (§15, §17, §30, §33)
 *
 * Address and deity only. No phone, email, official timings or donation
 * details: those are for the temple administration to enter.
 * ------------------------------------------------------------------ */

const SETTINGS = [
  ['temple_name', 'Srisomaalammatalli Temple'],
  ['temple_name_telugu', 'శ్రీ సోమాలమ్మ తల్లి దేవాలయం'],
  ['temple_deity', 'Sri Somalamma Thalli'],
  ['temple_deity_telugu', 'శ్రీ సోమాలమ్మ తల్లి'],
  ['temple_type', 'Hindu Temple — Local Goddess (Grama Devata) tradition'],
  ['temple_area', 'Mungandapalem, Munjavarapu Kottu'],
  ['temple_city', 'P. Gannavaram Mandal'],
  ['temple_district', 'Dr. B. R. Ambedkar Konaseema'],
  ['temple_state', 'Andhra Pradesh'],
  ['temple_pincode', '533214'],
  ['temple_country', 'India'],
  [
    'temple_address',
    'Srisomaalammatalli Temple, Munjavarapu Kottu, Mungandapalem, P. Gannavaram Mandal, Dr. B. R. Ambedkar Konaseema District, Andhra Pradesh 533214'
  ],
  ['temple_address_telugu', ''],
  // Third-party listing figures, kept editable and labelled as such on the
  // page. They are not temple-published facts.
  ['listing_rating', '4.7'],
  ['listing_review_count', '253'],
  ['listing_source', 'Google listing'],
  ['listing_hours_note', 'Publicly listed hours — not confirmed by the temple administration'],
  ['listing_opening_time', '06:30']
];

/* ------------------------------------------------------------------ */

async function upsertByKey(table, keyColumn, keyValue, columns, values) {
  const existing = await query(`SELECT id FROM ${table} WHERE ${keyColumn} = $1`, [keyValue]);
  if (existing.rows.length) {
    const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
    await query(`UPDATE ${table} SET ${setClause} WHERE ${keyColumn} = $${columns.length + 1}`, [
      ...values,
      keyValue
    ]);
    return 'updated';
  }
  const allColumns = ['id', ...columns];
  const placeholders = allColumns.map((_, i) => `$${i + 1}`).join(', ');
  await query(`INSERT INTO ${table} (${allColumns.join(', ')}) VALUES (${placeholders})`, [
    newId(table.slice(0, 4)),
    ...values
  ]);
  return 'inserted';
}

async function main() {
  console.log('Seeding historical content...\n');

  for (const entry of HISTORY) {
    await upsertByKey(
      'temple_history',
      'title',
      entry.title,
      [
        'period',
        'year_start',
        'title',
        'description',
        'source_type',
        'source_date',
        'verification_status',
        'display_order',
        'published'
      ],
      [
        entry.period || null,
        entry.yearStart || null,
        entry.title,
        entry.description,
        entry.sourceType,
        entry.sourceDate || null,
        entry.verification,
        entry.order,
        true
      ]
    );
  }
  console.log(`  ✓ temple_history (${HISTORY.length})`);

  for (const c of CLAIMS) {
    await upsertByKey(
      'historical_claims',
      'claim',
      c.claim,
      [
        'claim',
        'claim_type',
        'description',
        'source_type',
        'source_date',
        'verification_status',
        'admin_notes',
        'public_visible',
        'display_order'
      ],
      [
        c.claim,
        c.claimType || null,
        c.description || null,
        c.sourceType,
        c.sourceDate || null,
        c.verification,
        c.adminNotes || null,
        c.publicVisible,
        c.order
      ]
    );
  }
  const hidden = CLAIMS.filter((c) => !c.publicVisible).length;
  console.log(`  ✓ historical_claims (${CLAIMS.length}, ${hidden} recorded but not published)`);

  for (const i of INSCRIPTIONS) {
    await upsertByKey(
      'temple_inscriptions',
      'title',
      i.title,
      [
        'title',
        'location',
        'estimated_date',
        'historical_significance',
        'source',
        'verification_status',
        'public_visible'
      ],
      [
        i.title,
        i.location,
        i.estimatedDate,
        i.historicalSignificance,
        i.source,
        i.verification,
        i.publicVisible
      ]
    );
  }
  console.log(`  ✓ temple_inscriptions (${INSCRIPTIONS.length}, no transcription — not yet read)`);

  for (const f of FESTIVALS) {
    const slug = `somalamma-jatara-${f.year}`;
    await upsertByKey(
      'temple_festivals',
      'slug',
      slug,
      [
        'name',
        'name_telugu',
        'slug',
        'description',
        'festival_type',
        'calendar_reference',
        'year',
        'rituals',
        'historical_notes',
        'source_type',
        'verification_status',
        'display_order',
        'published'
      ],
      [
        f.name,
        'సోమాలమ్మ తల్లి జాతర',
        slug,
        f.description,
        'Jatara',
        'Associated with the Ugadi period; exact dates follow the lunar calendar each year',
        f.year,
        f.rituals || null,
        f.historicalNotes || null,
        f.sourceType,
        f.verification,
        2100 - f.year,
        true
      ]
    );
  }
  console.log(`  ✓ temple_festivals (${FESTIVALS.length}, 2021-2025)`);

  for (const [key, value] of SETTINGS) {
    const jsonValue = JSON.stringify(value);
    const existing = await query('SELECT key FROM settings WHERE key = $1', [key]);
    if (existing.rows.length) {
      await query('UPDATE settings SET value = $1 WHERE key = $2', [jsonValue, key]);
    } else {
      await query('INSERT INTO settings (key, value) VALUES ($1, $2)', [key, jsonValue]);
    }
  }
  console.log(`  ✓ settings (${SETTINGS.length})`);

  console.log('\nSeeded. Not seeded, and needed from the temple administration:');
  console.log('  - official temple timings (listing hours are third-party, and labelled so)');
  console.log('  - telephone number and email address');
  console.log('  - donation account details and the PhonePe QR image');
  console.log('  - trustee and committee names');
  console.log('  - the temple’s own history: when worship began, and who established it');
  console.log('  - the Jatara dates and the order of its rituals');
  console.log('  - latitude and longitude for the map');
}

main()
  .then(() => closeConnections())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Seeding failed:', err.message);
    await closeConnections().catch(() => {});
    process.exit(1);
  });
