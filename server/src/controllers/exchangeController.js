import * as exchangeService from '../services/exchangeService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { recordEvent } from '../services/analyticsService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createRequest = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const exchangeRequest = await demoWorkspaceService.createExchangeRequest(req.user.workspaceId, req.body);
      return ApiResponse.success(res, 'Exchange request sent successfully', { exchangeRequest }, HTTP_STATUS.CREATED);
    }
    const exchangeRequest = await exchangeService.createExchangeRequest(req.user._id, req.body);

    recordEvent({
      eventType: 'exchange_request_created',
      userId: req.user._id,
      metadata: {
        recipientId: req.body?.recipientId,
        isDemo: Boolean(req.user?.isDemo),
      },
    }).catch(() => {});

    return ApiResponse.success(res, 'Exchange request sent successfully', { exchangeRequest }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getRequests = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const requests = await demoWorkspaceService.getUserExchangeRequests(req.user.workspaceId);
      return ApiResponse.success(res, 'Exchange requests retrieved', requests);
    }
    const requests = await exchangeService.getUserExchangeRequests(req.user._id);
    return ApiResponse.success(res, 'Exchange requests retrieved', requests);
  } catch (error) {
    next(error);
  }
};

export const acceptRequest = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.acceptExchangeRequest(req.user.workspaceId, req.params.id);
      return ApiResponse.success(res, 'Exchange request accepted! Connection established.', result);
    }
    const result = await exchangeService.acceptExchangeRequest(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Exchange request accepted! Connection established.', result);
  } catch (error) {
    next(error);
  }
};

export const declineRequest = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.declineExchangeRequest(req.user.workspaceId, req.params.id);
      return ApiResponse.success(res, 'Exchange request declined', result);
    }
    const result = await exchangeService.declineExchangeRequest(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Exchange request declined', result);
  } catch (error) {
    next(error);
  }
};

export const checkPendingStatus = async (req, res, next) => {
  try {
    const { peerId } = req.params;
    if (req.user?.isDemo && req.user?.workspaceId) {
      const status = await demoWorkspaceService.getPendingRequestStatus(req.user.workspaceId, peerId);
      return ApiResponse.success(res, 'Pending request status retrieved', status);
    }
    const status = await exchangeService.getPendingRequestStatus(req.user._id, peerId);
    return ApiResponse.success(res, 'Pending request status retrieved', status);
  } catch (error) {
    next(error);
  }
};

export const getConnections = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const connections = await demoWorkspaceService.getConnections(req.user.workspaceId);
      return ApiResponse.success(res, 'Active connections retrieved', { connections });
    }
    const connections = await exchangeService.getUserConnections(req.user._id);
    return ApiResponse.success(res, 'Active connections retrieved', { connections });
  } catch (error) {
    next(error);
  }
};

