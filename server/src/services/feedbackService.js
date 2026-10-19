import nodemailer from 'nodemailer';
import { ApiError } from '../utils/apiError.js';

/**
 * Escapes characters for HTML rendering in email template
 */
const escapeHtml = (str) => {
  if (!str) return '<em>None provided</em>';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br/>');
};

/**
 * Submits user feedback by composing and sending an email to the configured admin address
 */
export const sendFeedbackEmail = async ({ rating, improvements, newFeatures, comments, user = null }) => {
  const recipientEmail = process.env.FEEDBACK_TO_EMAIL;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;

  // Determine if running in mock/testing mode
  const isMockMode =
    process.env.NODE_ENV === 'test' ||
    process.env.MOCK_DB === 'true' ||
    process.env.MOCK_EMAIL === 'true';

  // Check if email configuration is available
  if (!recipientEmail || !smtpUser || !smtpPass) {
    if (isMockMode) {
      console.log('ℹ️  [Mock Email Service] Simulated feedback delivery successfully accepted (test/mock environment).');
      return { delivered: true, simulated: true };
    }

    throw new ApiError(
      503,
      'Feedback email delivery service is currently not configured on the server. Please contact support or configure FEEDBACK_TO_EMAIL, SMTP_USER, and SMTP_PASS.'
    );
  }

  // Create transporter using configured SMTP settings
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for 587
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const ratingStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const senderContext = user
    ? `${user.name || 'Registered User'} (${user.email || 'Email on file'}, User ID: ${user._id || 'N/A'})`
    : 'Anonymous Visitor';

  const subject = `[EnhanceUs Feedback] ${rating}/5 Stars - ${ratingStars}`;

  const plainText = `
New EnhanceUs Feedback Received
=========================================
Rating: ${rating}/5 Stars (${ratingStars})
Submitted By: ${senderContext}
Date: ${new Date().toUTCString()}

1. How was your experience?
   ${rating}/5 Stars

2. Changes or improvements suggested:
   ${improvements || 'None provided'}

3. New features requested:
   ${newFeatures || 'None provided'}

4. Additional comments:
   ${comments || 'None provided'}
=========================================
Sent securely via EnhanceUs Platform Feedback Engine.
  `.trim();

  const htmlContent = `
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
    .rating-badge { display: inline-block; background: #f0fdfa; border: 1px solid #ccfbf1; color: #0f766e; font-weight: 700; font-size: 18px; padding: 8px 16px; rounded-radius: 12px; margin-bottom: 20px; }
    .field-card { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
    .field-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 6px; }
    .field-body { font-size: 13px; color: #334155; }
    .meta-box { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EnhanceUs Platform Feedback</h1>
      <p>Direct submission from user feedback interface</p>
    </div>
    <div class="content">
      <div class="rating-badge">
        Rating: ${rating} / 5 &nbsp; ${ratingStars}
      </div>

      <div class="field-card">
        <div class="field-title">1. What changes or improvements should we make?</div>
        <div class="field-body">${escapeHtml(improvements)}</div>
      </div>

      <div class="field-card">
        <div class="field-title">2. What new features would you like us to add?</div>
        <div class="field-body">${escapeHtml(newFeatures)}</div>
      </div>

      <div class="field-card">
        <div class="field-title">3. Additional Comments</div>
        <div class="field-body">${escapeHtml(comments)}</div>
      </div>

      <div class="meta-box">
        <strong>Sender Context:</strong> ${escapeHtml(senderContext)}<br/>
        <strong>Timestamp:</strong> ${new Date().toISOString()}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"EnhanceUs Feedback" <${smtpUser}>`,
      to: recipientEmail,
      subject,
      text: plainText,
      html: htmlContent,
    });

    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error('⚠️ [Feedback Email Error] Delivery failed:', err.message);
    throw new ApiError(502, 'Failed to deliver feedback email via SMTP. Please try again.');
  }
};

export default {
  sendFeedbackEmail,
};
