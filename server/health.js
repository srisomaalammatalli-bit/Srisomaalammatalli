import { checkConnection } from './_lib/db.js';
import { sendSuccess, sendError } from './_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    const dbStatus = await checkConnection();
    return sendSuccess(res, {
      status: 'healthy',
      app: 'Sri Somalamma Talli Temple Management Platform',
      environment: process.env.APP_ENV || 'development',
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  } catch (err) {
    return sendError(res, err.message, 'HEALTHCHECK_FAILED', 500);
  }
}
