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
  const key = process.env.PLUNK_API_KEY;
  return (
    !key ||
    key === 'your_plunk_api_key_here' ||
    key === 'placeholder' ||
    process.env.NODE_ENV === 'test' ||
    process.env.MOCK_EMAIL === 'true'
  );
};

/**
 * Base method to dispatch transactional emails through Plunk's REST API.
 */
export const sendPlunkEmail = async ({ to, subject, body, name = 'EnhanceUs', from = null }) => {
  const recipient = Array.isArray(to) ? to : [to];
  const apiKey = process.env.PLUNK_API_KEY;
  const fromEmail = from || process.env.PLUNK_FROM_EMAIL || 'no-reply@briefenai.me';

  if (shouldSimulateEmail()) {
    console.log(`📧 [Plunk Simulation] Email simulated to [${recipient.join(', ')}] with subject: "${subject}"`);
    return { success: true, simulated: true, to: recipient, subject };
  }

  try {
    const payload = {
      to: recipient.length === 1 ? recipient[0] : recipient,
      subject,
      body,
      name,
    };

    if (fromEmail) {
      payload.from = fromEmail;
    }

    const response = await fetch('https://api.useplunk.com/v1/send', {
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
        // Raw text
      }
      const errMsg = errJson?.message || errText || `HTTP ${response.status}`;
      console.error(`⚠️ [Plunk Email Error] Delivery to [${recipient.join(', ')}] failed:`, errMsg);
      throw new ApiError(502, `Failed to dispatch transactional email via Plunk: ${errMsg}`);
    }

    const data = await response.json();
    return { success: true, delivered: true, data };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('⚠️ [Plunk Network Error]:', err.message);
    throw new ApiError(502, 'Failed to connect to Plunk transactional email provider.');
  }
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
