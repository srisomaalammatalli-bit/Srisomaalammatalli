/**
 * /api/temple/inscriptions
 *
 * GET    public — inscriptions marked visible; admins see the rest
 * POST   admin  — record an inscription
 * PUT    admin  — add a photograph, reading or translation
 * DELETE admin  — remove a record
 *
 * A record may exist long before anyone has read the stone. transcription
 * and translation are optional for exactly that reason: an entry is created
 * to say "this inscription is reported to exist", and the reading is added
 * once the stone has actually been photographed and transcribed. Nothing
 * here invents a reading, and an entry with no transcription renders as
 * outstanding work rather than as a documented text.
 */

import { createResourceHandler } from '../../_lib/crud.js';
import {
  VERIFICATION_STATUSES,
  enumField,
  urlField,
  text,
  bool,
  int
} from '../../_lib/evidence.js';

export default createResourceHandler({
  table: 'temple_inscriptions',
  idPrefix: 'insc',
  entityType: 'Inscription',
  publicSelect: `id, title, location, estimated_date, original_language, transcription,
                 translation, historical_significance, image_url, document_url,
                 source, source_url, verification_status, display_order, created_at`,
  publicWhere: 'public_visible = TRUE',
  orderBy: 'display_order ASC, created_at ASC',
  requiredOnCreate: ['title'],
  fields: {
    title: { column: 'title', transform: text(200) },
    location: { column: 'location', transform: text(300) },
    // Free text, not a date column: "Reported 1911", "undated", "illegible"
    // are all honest answers that a DATE column could not hold.
    estimatedDate: { column: 'estimated_date', transform: text(120) },
    originalLanguage: { column: 'original_language', transform: text(80) },
    transcription: { column: 'transcription', transform: text(20000) },
    translation: { column: 'translation', transform: text(20000) },
    historicalSignificance: { column: 'historical_significance', transform: text(10000) },
    imageUrl: urlField('image_url', 'Photograph link'),
    documentUrl: urlField('document_url', 'Document link'),
    mediaId: { column: 'media_id', transform: text(64) },
    source: { column: 'source', transform: text(300) },
    sourceUrl: urlField('source_url', 'Source link'),
    verificationStatus: enumField('verification_status', VERIFICATION_STATUSES, 'Needs Verification'),
    publicVisible: { column: 'public_visible', transform: bool },
    displayOrder: { column: 'display_order', transform: int }
  }
});
