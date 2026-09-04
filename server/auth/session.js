import { getAuthenticatedUser } from '../_lib/auth.js';
import { sendSuccess, sendError } from '../_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return sendSuccess(res, { authenticated: false, user: null });
    }

    return sendSuccess(res, {
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        roleName: user.roleName
      }
    });
  } catch (err) {
    return sendError(res, err.message, 'SESSION_CHECK_FAILED', 500);
  }
}
