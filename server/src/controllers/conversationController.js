import * as conversationService from '../services/conversationService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const getConversations = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const conversations = await demoWorkspaceService.getConversations(req.user.workspaceId);
      return ApiResponse.success(res, 'Conversations retrieved', { conversations });
    }
    const conversations = await conversationService.getUserConversations(req.user._id);
    return ApiResponse.success(res, 'Conversations retrieved', { conversations });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const messages = await demoWorkspaceService.getMessages(req.user.workspaceId, req.params.id);
      return ApiResponse.success(res, 'Conversation details retrieved', { messages });
    }
    const result = await conversationService.getConversationById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Conversation details retrieved', result);
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const message = await demoWorkspaceService.sendMessage(req.user.workspaceId, req.params.id, req.body);
      return ApiResponse.success(res, 'Message sent', { message }, HTTP_STATUS.CREATED);
    }
    const message = await conversationService.sendMessage(req.params.id, req.user._id, req.body.text);
    return ApiResponse.success(res, 'Message sent', { message }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};
