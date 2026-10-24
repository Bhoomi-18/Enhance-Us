/**
 * Admin authorization utility and allowlist normalization engine.
 * Admin access is strictly controlled by the backend-only ADMIN_EMAILS allowlist.
 */

export const getAdminEmails = () => {
  const envVal = (process.env.ADMIN_EMAILS || '').trim();
  if (!envVal || typeof envVal !== 'string') return new Set();

  const cleaned = envVal
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .split(',')
    .map((e) => e.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
    .filter(Boolean);

  return new Set(cleaned);
};

export const isAdminEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  const allowlist = getAdminEmails();
  return allowlist.has(normalized);
};

export const validateAdminAccess = (user) => {
  if (!user) {
    return {
      allowed: false,
      statusCode: 401,
      reason: 'Authentication required to access the admin portal.',
    };
  }

  // 1. Demo accounts are strictly blocked from admin privileges
  if (user.isDemo) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'Demo accounts are strictly prohibited from accessing administrative tools.',
    };
  }

  // 2. Suspended accounts are blocked
  if (user.isSuspended) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'This account has been suspended. Administrative access is revoked.',
    };
  }

  // 3. Email verification required
  if (user.emailVerified === false) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'Your email address must be verified before accessing the admin portal.',
    };
  }

  // 4. Server-side allowlist match
  const userEmail = (user.email || '').trim().toLowerCase();
  const allowlist = getAdminEmails();

  if (allowlist.size === 0) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'Administrative access is not configured. Please define ADMIN_EMAILS in server settings.',
    };
  }

  if (!allowlist.has(userEmail)) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'Access denied. Your account is not authorized for administrative access.',
    };
  }

  return { allowed: true };
};

export default {
  getAdminEmails,
  isAdminEmail,
  validateAdminAccess,
};
