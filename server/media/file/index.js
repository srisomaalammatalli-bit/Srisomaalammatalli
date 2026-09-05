import { query } from '../../_lib/db.js';
import { sendNotFound, sendError } from '../../_lib/response.js';

export default async function mediaFileHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const id = req.query?.id || req.id;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Media id is required' });
  }

  try {
    const result = await query('SELECT mime_type, data FROM media_blobs WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Media file not found');
    }

    const row = result.rows[0];
    const buffer = Buffer.from(row.data, 'base64');

    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[Media File Error]', err);
    return sendError(res, 'Could not retrieve media file');
  }
}
