import * as notificationService from '../services/notificationService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getNotifications = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const notifications = await demoWorkspaceService.getNotifications(req.user.workspaceId);
      return ApiResponse.success(res, 'Notifications retrieved', { notifications });
    }
    const notifications = await notificationService.getUserNotifications(req.user._id);
    return ApiResponse.success(res, 'Notifications retrieved', { notifications });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const notification = await demoWorkspaceService.markNotificationRead(req.user.workspaceId, req.params.id);
      return ApiResponse.success(res, 'Notification marked as read', { notification });
    }
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Notification marked as read', { notification });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user._id);
    return ApiResponse.success(res, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};
