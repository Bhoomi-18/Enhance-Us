import * as conversationService from '../services/conversationService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const getConversations = async (req, res, next) => {
  try {
    const conversations = await conversationService.getUserConversations(req.user._id);
    return ApiResponse.success(res, 'Conversations retrieved', { conversations });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const result = await conversationService.getConversationById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Conversation details retrieved', result);
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const message = await conversationService.sendMessage(req.params.id, req.user._id, req.body.text);
    return ApiResponse.success(res, 'Message sent', { message }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};
