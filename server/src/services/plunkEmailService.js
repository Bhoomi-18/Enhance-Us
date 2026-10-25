import { ApiError } from '../utils/apiError.js';

/**
 * Escapes characters for HTML rendering in email templates to prevent HTML injection
 */
export const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br/>');
};

/**
 * Resolves trusted frontend origin. Defaults strictly to canonical production URL.
 */
export const getFrontendBaseUrl = () => {
  const configured = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN;
  if (configured && !configured.includes('localhost') && process.env.NODE_ENV === 'production') {
    return configured.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV !== 'production' && configured) {
    return configured.replace(/\/$/, '');
  }
  return 'https://www.briefenai.me';
};

/**
 * Checks whether transactional emails should be simulated in test/placeholder environments.
 */
const shouldSimulateEmail = () => {
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true') {
    return true;
  }
  const key = (process.env.PLUNK_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  // Only simulate in local development when key is omitted or placeholder
  if (process.env.NODE_ENV !== 'production' && (!key || key.startsWith('your_plunk') || key === 'placeholder')) {
    return true;
  }
  return false;
};

/**
 * Base method to dispatch transactional emails through Plunk's REST API.
 * Uses Plunk Cloud's active production endpoint (https://next-api.useplunk.com/v1/send)
 * with automatic fallback to https://api.useplunk.com/v1/send.
 */
export const sendPlunkEmail = async ({ to, subject, body, name = 'EnhanceUs', from = null }) => {
  const recipient = Array.isArray(to) ? (to.length === 1 ? to[0] : to) : to;
  const rawKey = process.env.PLUNK_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^['"]|['"]$/g, '').replace(/^Bearer\s+/i, '');
  const fromEmail = (from || process.env.PLUNK_FROM_EMAIL || 'no-reply@briefenai.me')
    .trim()
    .replace(/^['"]|['"]$/g, '');

  if (shouldSimulateEmail()) {
    console.log(`📧 [Plunk Simulation] Email simulated to [${Array.isArray(recipient) ? recipient.join(', ') : recipient}] with subject: "${subject}"`);
    return { success: true, simulated: true, delivered: false, to: recipient, subject };
  }

  // Production check: ensure secret key is configured and not a public key
  if (!apiKey || apiKey === 'placeholder' || apiKey.startsWith('your_plunk')) {
    console.error('❌ [Plunk Config Error] PLUNK_API_KEY is not configured in Render environment variables.');
    throw new ApiError(503, 'Email service is currently unconfigured. Please configure PLUNK_API_KEY in Render.');
  }

  if (apiKey.startsWith('pk_')) {
    console.error('❌ [Plunk Key Error] PLUNK_API_KEY is configured with a Public Key (pk_*). Plunk transactional email sending requires a Secret Key (sk_*).');
    throw new ApiError(503, 'Email service configuration error: A Plunk secret key (sk_*) is required on the backend, not a public key.');
  }

  const payload = {
    to: recipient,
    subject,
    body,
    name,
    fromName: name,
  };

  if (fromEmail) {
    payload.from = fromEmail;
  }

  const endpoints = [
    'https://next-api.useplunk.com/v1/send',
    'https://api.useplunk.com/v1/send',
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errJson = null;
        try {
          errJson = JSON.parse(errText);
        } catch (e) {
          // Non-JSON response
        }

        let detailedMessage = '';
        if (errJson) {
          if (errJson.error?.errors && Array.isArray(errJson.error.errors) && errJson.error.errors.length > 0) {
            detailedMessage = errJson.error.errors.map((e) => `${e.field || ''}: ${e.message}`).join(', ');
          } else if (errJson.error?.message) {
            detailedMessage = errJson.error.message;
            if (errJson.error.suggestion) {
              detailedMessage += ` (${errJson.error.suggestion})`;
            }
          } else if (errJson.message) {
            detailedMessage = errJson.message;
          } else if (typeof errJson.error === 'string') {
            detailedMessage = errJson.error;
          }
        }

        const logMsg = detailedMessage || errText || `HTTP ${response.status}`;
        console.error(`⚠️ [Plunk Email Error] (${response.status}) Delivery to [${Array.isArray(recipient) ? recipient.join(', ') : recipient}] failed:`, logMsg);

        let userMessage = 'Email provider failed to deliver message.';
        if (response.status === 401) {
          userMessage = 'Email service authentication failed. Please verify that PLUNK_API_KEY is a valid secret key (sk_*) in Render.';
        } else if (response.status === 422) {
          userMessage = `Email provider validation failed: ${detailedMessage || 'Domain or sender address not permitted'}.`;
        } else if (response.status === 429) {
          userMessage = 'Email provider rate limit reached. Please wait a moment before retrying.';
        } else if (detailedMessage) {
          userMessage = `Email delivery failed: ${detailedMessage}`;
        }

        throw new ApiError(502, userMessage, { providerStatus: response.status });
      }

      const data = await response.json();
      return {
        success: true,
        delivered: true,
        accepted: true,
        data: data?.data || data,
      };
    } catch (err) {
      if (err instanceof ApiError) {
        // If it's a 4xx error from Plunk, trying the second endpoint won't help
        throw err;
      }
      lastError = err;
      console.warn(`⚠️ [Plunk Failover] Endpoint ${endpoint} failed (${err.message}). Trying fallback endpoint...`);
    }
  }

  console.error('⚠️ [Plunk Network Error] All Plunk API endpoints failed:', lastError?.message);
  throw new ApiError(502, 'Failed to connect to Plunk transactional email provider.');
};

/**
 * Dispatches account email verification link
 */
export const sendVerificationEmail = async ({ to, name, verificationToken }) => {
  const baseUrl = getFrontendBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  const displayName = name ? escapeHtml(name) : 'EnhanceUs Learner';

  const subject = 'Verify your EnhanceUs account';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 24px; background-color: #f8fafc; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0d9488; color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.92; }
    .content { padding: 32px 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #0d9488; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; }
    .alt-link { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
    .footer { padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to EnhanceUs</h1>
      <p>Goal-Driven Peer Skill Exchange</p>
    </div>
    <div class="content">
      <p>Hello <strong>${displayName}</strong>,</p>
      <p>Thank you for joining EnhanceUs! To activate your account and start discovering personalized AI learning roadmaps and peer exchange partners, please confirm your email address.</p>
      
      <div class="btn-container">
        <a href="${verifyUrl}" class="btn" target="_blank" rel="noopener noreferrer">Verify My Email Address</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">This verification link will expire in <strong>24 hours</strong>. If you did not create an EnhanceUs account, you can safely ignore this email.</p>

      <div class="alt-link">
        <p style="margin: 0 0 6px 0;">If the button above does not work, copy and paste this link into your browser:</p>
        <a href="${verifyUrl}" style="color: #0d9488;">${verifyUrl}</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} EnhanceUs. All rights reserved.<br/>
      Sent securely via Plunk transactional email engine.
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendPlunkEmail({
    to,
    subject,
    body: html,
    name: 'EnhanceUs Verification',
  });
};

/**
 * Dispatches password reset link
 */
export const sendPasswordResetEmail = async ({ to, name, resetToken }) => {
  const baseUrl = getFrontendBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const displayName = name ? escapeHtml(name) : 'EnhanceUs User';

  const subject = 'Reset your EnhanceUs password';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 24px; background-color: #f8fafc; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f766e; color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.92; }
    .content { padding: 32px 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #0f766e; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; }
    .alt-link { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
    .footer { padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
      <p>EnhanceUs Security & Account Services</p>
    </div>
    <div class="content">
      <p>Hello <strong>${displayName}</strong>,</p>
      <p>We received a request to reset the password for your EnhanceUs account. Click the button below to choose a new, secure password:</p>
      
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset My Password</a>
      </div>

      <p style="font-size: 13px; color: #b91c1c; font-weight: 600;">For your security, this password reset link will expire in 30 minutes.</p>
      <p style="font-size: 13px; color: #64748b;">If you did not request a password reset, you can safely ignore this email. Your current password remains unchanged.</p>

      <div class="alt-link">
        <p style="margin: 0 0 6px 0;">If the button above does not work, copy and paste this link into your browser:</p>
        <a href="${resetUrl}" style="color: #0f766e;">${resetUrl}</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} EnhanceUs. All rights reserved.<br/>
      Sent securely via Plunk transactional email engine.
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendPlunkEmail({
    to,
    subject,
    body: html,
    name: 'EnhanceUs Security',
  });
};

/**
 * Dispatches platform user feedback notifications to the support inbox
 */
export const sendFeedbackNotificationEmail = async ({ rating, improvements, newFeatures, comments, user = null }) => {
  const destinationEmail =
    process.env.SUPPORT_EMAIL || process.env.FEEDBACK_TO_EMAIL || 'support@briefenai.me';

  const ratingStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const senderContext = user
    ? `${user.name || 'Registered User'} (${user.email || 'Email on file'}, User ID: ${user._id || 'N/A'})`
    : 'Anonymous Visitor';

  const subject = `[New EnhanceUs Feedback] ${rating}/5 Stars - ${ratingStars}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 20px; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0d9488; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em; }
    .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 24px; }
    .rating-badge { display: inline-block; background: #f0fdfa; border: 1px solid #ccfbf1; color: #0f766e; font-weight: 700; font-size: 18px; padding: 8px 16px; border-radius: 12px; margin-bottom: 20px; }
    .field-card { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
    .field-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 6px; }
    .field-body { font-size: 13px; color: #334155; }
    .meta-box { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New EnhanceUs Feedback Received</h1>
      <p>Direct submission from user feedback interface</p>
    </div>
    <div class="content">
      <div class="rating-badge">
        Rating: ${rating} / 5 &nbsp; ${ratingStars}
      </div>

      <div class="field-card">
        <div class="field-title">1. What changes or improvements should we make?</div>
        <div class="field-body">${escapeHtml(improvements) || '<em>None provided</em>'}</div>
      </div>

      <div class="field-card">
        <div class="field-title">2. What features or additions would you like to see?</div>
        <div class="field-body">${escapeHtml(newFeatures) || '<em>None provided</em>'}</div>
      </div>

      <div class="field-card">
        <div class="field-title">3. Additional comments</div>
        <div class="field-body">${escapeHtml(comments) || '<em>None provided</em>'}</div>
      </div>

      <div class="meta-box">
        <strong>Submitted By:</strong> ${escapeHtml(senderContext)}<br/>
        <strong>Timestamp:</strong> ${new Date().toUTCString()}<br/>
        <strong>Destination:</strong> ${destinationEmail}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendPlunkEmail({
    to: destinationEmail,
    subject,
    body: html,
    name: 'EnhanceUs Feedback Notification',
  });
};

/**
 * Dispatches an email copy of a user-facing application notification.
 * Handles provider errors gracefully so main app flow is never interrupted.
 */
export const sendNotificationEmail = async ({ to, name, type, title, message, link }) => {
  try {
    if (!to) return { success: false, reason: 'No recipient email provided' };

    const baseUrl = getFrontendBaseUrl();
    const actionUrl = link
      ? `${baseUrl}${link.startsWith('/') ? link : `/${link}`}`
      : `${baseUrl}/notifications`;
    const settingsUrl = `${baseUrl}/settings`;
    const displayName = name ? escapeHtml(name) : 'EnhanceUs Member';
    const escapedTitle = escapeHtml(title || 'New Notification');
    const escapedMessage = escapeHtml(message || '');

    const subject = `[EnhanceUs] ${title || 'New Notification'}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 24px; background-color: #f8fafc; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0d9488; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em; }
    .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.92; }
    .content { padding: 28px 24px; }
    .notif-card { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0d9488; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }
    .notif-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
    .notif-body { font-size: 13px; color: #475569; line-height: 1.5; }
    .btn-container { text-align: center; margin: 28px 0 16px 0; }
    .btn { display: inline-block; background-color: #0d9488; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 10px; }
    .footer { padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; }
    .footer a { color: #0d9488; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EnhanceUs Notification</h1>
      <p>Goal-Driven Peer Skill Exchange</p>
    </div>
    <div class="content">
      <p>Hello <strong>${displayName}</strong>,</p>
      <p>You have received a new update on EnhanceUs:</p>

      <div class="notif-card">
        <div class="notif-title">${escapedTitle}</div>
        <div class="notif-body">${escapedMessage}</div>
      </div>

      <div class="btn-container">
        <a href="${actionUrl}" class="btn" target="_blank" rel="noopener noreferrer">View in EnhanceUs</a>
      </div>
    </div>
    <div class="footer">
      You are receiving this email based on your EnhanceUs notification settings.<br/>
      You can manage your notification preferences or opt out of optional emails anytime in your <a href="${settingsUrl}">Account Settings</a>.<br/>
      &copy; ${new Date().getFullYear()} EnhanceUs. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();

    const result = await sendPlunkEmail({
      to,
      subject,
      body: html,
      name: 'EnhanceUs Notifications',
    });

    return result;
  } catch (err) {
    console.warn(`⚠️ [Notification Email Delivery Non-fatal] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};
