import * as portfolioService from '../services/portfolioService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getUserPortfolio = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (req.user?.isDemo && req.user?.workspaceId && (!userId || userId === req.user._id?.toString())) {
      const result = await demoWorkspaceService.getUserPortfolio(req.user.workspaceId, userId);
      return ApiResponse.success(res, 'Portfolio items retrieved', result);
    }
    const result = await portfolioService.getUserPortfolio(userId, req.user);
    return ApiResponse.success(res, 'Portfolio items retrieved', result);
  } catch (error) {
    next(error);
  }
};

export const createPortfolioItem = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const item = await demoWorkspaceService.createPortfolioItem(req.user.workspaceId, req.body);
      return ApiResponse.created(res, 'Portfolio item created successfully', { item });
    }
    const item = await portfolioService.createPortfolioItem(req.user._id, req.body);
    return ApiResponse.created(res, 'Portfolio item created successfully', { item });
  } catch (error) {
    next(error);
  }
};

export const updatePortfolioItem = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const item = await demoWorkspaceService.updatePortfolioItem(req.user.workspaceId, req.params.id, req.body);
      return ApiResponse.success(res, 'Portfolio item updated successfully', { item });
    }
    const item = await portfolioService.updatePortfolioItem(req.params.id, req.user._id, req.body);
    return ApiResponse.success(res, 'Portfolio item updated successfully', { item });
  } catch (error) {
    next(error);
  }
};

export const deletePortfolioItem = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      await demoWorkspaceService.deletePortfolioItem(req.user.workspaceId, req.params.id);
      return ApiResponse.success(res, 'Portfolio item deleted successfully');
    }
    await portfolioService.deletePortfolioItem(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Portfolio item deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const confirmExchangeOutcome = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const item = await demoWorkspaceService.createPortfolioItem(req.user.workspaceId, {
        ...req.body,
        verificationStatus: 'EXCHANGE_CONFIRMED',
      });
      return ApiResponse.created(res, 'Exchange-confirmed portfolio achievement created', { item });
    }
    const item = await portfolioService.confirmExchangePortfolioOutcome(req.user._id, req.body);
    return ApiResponse.created(res, 'Exchange-confirmed portfolio achievement created', { item });
  } catch (error) {
    next(error);
  }
};

export const createFromMilestone = async (req, res, next) => {
  try {
    const item = await portfolioService.createPortfolioFromMilestone(req.user._id, req.body);
    return ApiResponse.created(res, 'Portfolio milestone achievement created', { item });
  } catch (error) {
    next(error);
  }
};

export default {
  getUserPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  confirmExchangeOutcome,
  createFromMilestone,
};
