import Notification from '../models/notificationModel.js';
import { ApiError } from '../utils/apiError.js';

export const getUserNotifications = async (userId) => {
  if (process.env.MOCK_DB === 'true') {
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
  if (process.env.MOCK_DB === 'true') return { success: true };

  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) throw new ApiError(404, 'Notification not found');

  notification.read = true;
  await notification.save();
  return notification;
};

export const markAllAsRead = async (userId) => {
  if (process.env.MOCK_DB === 'true') return { success: true };

  await Notification.updateMany({ recipient: userId, read: false }, { read: true });
  return { success: true };
};
