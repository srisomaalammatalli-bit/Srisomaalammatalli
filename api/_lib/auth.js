/**
 * Server-Side Authentication & Session Security for Admin Portal.
 * Uses HTTP-only secure cookies and server-side token validation.
 * No secrets or tokens are ever stored in localStorage.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { parse as parseCookie, serialize as serializeCookie } from 'cookie';
import { query } from './db.js';

const COOKIE_NAME = 'somalamma_admin_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Compare plain password against hash.
 */
export async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Create a new cryptographically random session token and insert into database.
 */
export async function createSession(userId, req) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const sessionId = 'ses_' + crypto.randomBytes(16).toString('hex');

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  await query(
    `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [sessionId, userId, tokenHash, ip, userAgent, expiresAt]
  );

  return { rawToken, expiresAt };
}

/**
 * Serialize session cookie for Set-Cookie header.
 */
export function setSessionCookie(res, rawToken, expiresAt) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
  const cookieStr = serializeCookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  });
  res.setHeader('Set-Cookie', cookieStr);
}

/**
 * Expire/clear session cookie.
 */
export function clearSessionCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
  const cookieStr = serializeCookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  res.setHeader('Set-Cookie', cookieStr);
}

/**
 * Authenticate incoming request using session cookie.
 * Verifies token against database and loads authenticated user and role.
 */
export async function getAuthenticatedUser(req) {
  try {
    const cookiesHeader = req.headers.cookie || '';
    const cookies = parseCookie(cookiesHeader);
    const rawToken = cookies[COOKIE_NAME];

    if (!rawToken) return null;

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const result = await query(
      `SELECT u.id, u.name, u.email, u.mobile, u.status, r.id as role_id, r.name as role_name, s.id as session_id
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'Active'`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      mobile: row.mobile,
      role: row.role_id,
      roleName: row.role_name,
      sessionId: row.session_id
    };
  } catch (err) {
    console.error('[Auth Error]', err.message);
    return null;
  }
}

/**
 * Check if authenticated user has any of the required roles.
 */
export function hasRequiredRole(user, allowedRoles = []) {
  if (!user) return false;
  if (user.role === 'super_admin') return true; // Super Admin always has full access
  return allowedRoles.includes(user.role);
}
