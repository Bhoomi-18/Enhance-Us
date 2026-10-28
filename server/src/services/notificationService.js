import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';
import { ApiError } from '../utils/apiError.js';
import { sendNotificationEmail } from './plunkEmailService.js';

export const NOTIFICATION_TYPE_TO_CATEGORY = {
  SESSION_SCHEDULED: 'sessionUpdates',
  SESSION_COMPLETED: 'sessionUpdates',
  CIRCLE_SESSION_SCHEDULED: 'sessionUpdates',
  GOAL_REMINDER: 'goalReminders',
  CIRCLE_ROADMAP_UPDATE: 'goalReminders',
  MATCH: 'peerActivity',
  REQUEST: 'peerActivity',
  REQUEST_ACCEPTED: 'peerActivity',
  REQUEST_DECLINED: 'peerActivity',
  MESSAGE: 'peerActivity',
  REVIEW_RECEIVED: 'peerActivity',
  CIRCLE_INVITE: 'circleActivity',
  CIRCLE_JOIN_REQUEST: 'circleActivity',
  CIRCLE_REQUEST_ACCEPTED: 'circleActivity',
  CIRCLE_ANNOUNCEMENT: 'circleActivity',
  PLATFORM_ANNOUNCEMENT: 'platformAnnouncements',
  CHALLENGE_INVITE: 'peerActivity',
  CHALLENGE_MILESTONE: 'goalReminders',
  CHALLENGE_COMPLETED: 'goalReminders',
  CHALLENGE_UPDATE: 'peerActivity',
  ACHIEVEMENT_UNLOCKED: 'platformAnnouncements',
  WORKSPACE_INVITE: 'peerActivity',
};

export const getUserNotifications = async (userId) => {
  if (process.env.MOCK_DB === 'true' && Notification.db?.readyState !== 1) {
    return [
      {
        _id: 'mock_notif_1',
        recipient: userId,
        type: 'MATCH',
        title: 'New Reciprocal Match Identified',
        message: 'Sarah Chen (UI/UX Specialist) is a 94% fit for your AI SaaS goal.',
        link: '/matches',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return await Notification.find({ recipient: userId })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 });
};

export const markAsRead = async (notificationId, userId) => {
  if (process.env.MOCK_DB === 'true' && Notification.db?.readyState !== 1) return { success: true };

  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) throw new ApiError(404, 'Notification not found');

  notification.read = true;
  await notification.save();
  return notification;
};

export const markAllAsRead = async (userId) => {
  if (process.env.MOCK_DB === 'true' && Notification.db?.readyState !== 1) return { success: true };

  await Notification.updateMany({ recipient: userId, read: false }, { read: true });
  return { success: true };
};

/**
 * Creates an in-app notification if the recipient has enabled notifications
 * for the corresponding category in their notificationPreferences,
 * and delivers an email notification unless opted out.
 */
export const createFilteredNotification = async ({
  recipientId,
  senderId = null,
  type,
  title,
  message,
  link = '',
}) => {
  if (!recipientId || !type || !title || !message) {
    throw new ApiError(400, 'Recipient ID, type, title, and message are required');
  }

  if (process.env.MOCK_DB === 'true' && Notification.db?.readyState !== 1) {
    return {
      created: true,
      notification: {
        _id: 'mock_notif_' + Date.now(),
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        message,
        link,
        read: false,
        createdAt: new Date().toISOString(),
      },
      emailDelivery: { attempted: false, delivered: false, simulated: true },
    };
  }

  // Lookup recipient preferences and contact details
  const recipient = await User.findById(recipientId).select(
    'name email isDemo notificationPreferences'
  );
  if (!recipient) {
    throw new ApiError(404, 'Recipient user not found');
  }

  const category = NOTIFICATION_TYPE_TO_CATEGORY[type];
  if (category && recipient.notificationPreferences) {
    const isEnabled = recipient.notificationPreferences[category];
    if (isEnabled === false) {
      // Respect opt-out: safely suppress in-app and email notification without writing to DB
      return {
        created: false,
        suppressed: true,
        category,
        reason: `User opted out of ${category} notifications`,
      };
    }
  }

  const notification = await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    link,
  });

  const emailDelivery = { attempted: false, delivered: false, suppressed: false };

  // Dispatch email copy if user has not disabled optional email notifications
  // and recipient is not a demo account (mandatory demo safety rule)
  if (recipient && !recipient.isDemo && recipient.email) {
    const isEmailOptedOut = recipient.notificationPreferences?.emailNotifications === false;
    if (!isEmailOptedOut) {
      emailDelivery.attempted = true;
      try {
        const emailResult = await sendNotificationEmail({
          to: recipient.email,
          name: recipient.name,
          type,
          title,
          message,
          link,
        });
        emailDelivery.delivered = Boolean(
          emailResult?.success || emailResult?.delivered || emailResult?.simulated
        );
      } catch (emailErr) {
        console.warn('⚠️ [Notification Email Delivery Non-fatal]', emailErr.message);
      }
    } else {
      emailDelivery.suppressed = true;
      emailDelivery.reason = 'Recipient opted out of optional email notifications';
    }
  } else if (recipient?.isDemo) {
    emailDelivery.suppressed = true;
    emailDelivery.reason = 'Demo interactions never send external emails';
  }

  return { created: true, notification, emailDelivery };
};

/**
 * Retrieves notification preferences for a user
 */
export const getUserPreferences = async (userId) => {
  if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
    return {
      emailNotifications: true,
      sessionUpdates: true,
      goalReminders: true,
      peerActivity: true,
      circleActivity: true,
      platformAnnouncements: true,
    };
  }

  const user = await User.findById(userId).select('notificationPreferences');
  if (!user) throw new ApiError(404, 'User not found');

  const prefs = user.notificationPreferences
    ? user.notificationPreferences.toObject
      ? user.notificationPreferences.toObject()
      : user.notificationPreferences
    : {};

  return {
    emailNotifications: prefs.emailNotifications !== undefined ? prefs.emailNotifications : true,
    sessionUpdates: prefs.sessionUpdates !== undefined ? prefs.sessionUpdates : true,
    goalReminders: prefs.goalReminders !== undefined ? prefs.goalReminders : true,
    peerActivity: prefs.peerActivity !== undefined ? prefs.peerActivity : true,
    circleActivity: prefs.circleActivity !== undefined ? prefs.circleActivity : true,
    platformAnnouncements: prefs.platformAnnouncements !== undefined ? prefs.platformAnnouncements : true,
  };
};

/**
 * Updates notification preferences for a user
 */
export const updateUserPreferences = async (userId, preferences = {}) => {
  const allowedCategories = [
    'emailNotifications',
    'sessionUpdates',
    'goalReminders',
    'peerActivity',
    'circleActivity',
    'platformAnnouncements',
  ];

  const sanitized = {};
  for (const cat of allowedCategories) {
    if (preferences[cat] !== undefined) {
      sanitized[cat] = Boolean(preferences[cat]);
    }
  }

  if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
    return {
      emailNotifications: true,
      sessionUpdates: true,
      goalReminders: true,
      peerActivity: true,
      circleActivity: true,
      platformAnnouncements: true,
      ...sanitized,
    };
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const currentPrefs = user.notificationPreferences
    ? user.notificationPreferences.toObject
      ? user.notificationPreferences.toObject()
      : user.notificationPreferences
    : {};

  user.notificationPreferences = {
    emailNotifications: true,
    sessionUpdates: true,
    goalReminders: true,
    peerActivity: true,
    circleActivity: true,
    platformAnnouncements: true,
    ...currentPrefs,
    ...sanitized,
  };

  user.markModified('notificationPreferences');
  await user.save();
  return user.notificationPreferences;
};

