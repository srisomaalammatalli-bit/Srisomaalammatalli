import crypto from 'crypto';
import { query } from '../_lib/db.js';
import { sendSuccess, sendError, sendBadRequest } from '../_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return sendError(res, 'Method not allowed', 405);
  }

  try {
    const { name, mobile, message } = req.body || {};

    if (!name || !mobile || !message) {
      return sendBadRequest(res, 'Name, mobile number, and enquiry message are required.');
    }

    const enquiryId = 'enq_' + crypto.randomBytes(12).toString('hex');
    const cleanMobile = String(mobile).replace(/\s+/g, '');

    const result = await query(
      `INSERT INTO enquiries (id, name, mobile, message, status)
       VALUES ($1, $2, $3, $4, 'New')
       RETURNING *`,
      [enquiryId, name.trim(), cleanMobile, message.trim()]
    );

    return sendSuccess(res, { enquiry: result.rows[0] }, 'Your message has been received by the temple committee.', 201);
  } catch (err) {
    console.error('[Enquiries POST Error]', err);
    return sendError(res, 'Failed to submit enquiry.');
  }
}
