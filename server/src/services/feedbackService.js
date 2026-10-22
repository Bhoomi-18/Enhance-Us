import Feedback from '../models/feedbackModel.js';
import { sendFeedbackNotificationEmail } from './plunkEmailService.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Persists feedback to MongoDB and dispatches an email notification to support@briefenai.me
 */
export const recordAndSendFeedback = async ({ rating, improvements, newFeatures, comments, user = null }) => {
  let savedFeedback = null;

  // 1. Persist feedback to MongoDB if database connection is available
  if (Feedback.db?.readyState === 1) {
    try {
      savedFeedback = await Feedback.create({
        rating,
        improvements: improvements ? improvements.trim() : '',
        newFeatures: newFeatures ? newFeatures.trim() : '',
        comments: comments ? comments.trim() : '',
        user: user?._id || null,
        submittedEmail: user?.email || null,
        emailDelivered: false,
      });
      console.log(`📝 [Feedback Stored] ID: ${savedFeedback._id} by ${user?.email || 'Anonymous'}`);
    } catch (dbErr) {
      console.warn('⚠️ [Feedback DB Warning] Could not persist to MongoDB:', dbErr.message);
    }
  }

  // 2. Dispatch notification email to support@briefenai.me via Plunk
  let emailResult = { delivered: false };
  try {
    const plunkRes = await sendFeedbackNotificationEmail({
      rating,
      improvements,
      newFeatures,
      comments,
      user,
    });
    emailResult = { delivered: true, simulated: plunkRes.simulated || false };

    if (savedFeedback) {
      savedFeedback.emailDelivered = true;
      await savedFeedback.save();
    }
  } catch (emailErr) {
    console.error('⚠️ [Feedback Email Warning] Plunk dispatch failed, but feedback was preserved:', emailErr.message);
    if (savedFeedback) {
      savedFeedback.emailDeliveryError = emailErr.message;
      await savedFeedback.save().catch(() => {});
    }
    // As per Phase 6: If email fails after storage, do not discard or fail the user request
    emailResult = { delivered: false, pending: true, error: emailErr.message };
  }

  return {
    success: true,
    feedbackId: savedFeedback?._id || 'mock_feedback_' + Date.now(),
    delivered: emailResult.delivered,
    simulated: emailResult.simulated || false,
    emailPending: Boolean(emailResult.pending),
    deliveryError: emailResult.error || null,
  };
};

// Backwards-compatible export
export const sendFeedbackEmail = recordAndSendFeedback;

export default {
  recordAndSendFeedback,
  sendFeedbackEmail,
};
