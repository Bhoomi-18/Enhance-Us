import * as exchangeService from '../services/exchangeService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createRequest = async (req, res, next) => {
  try {
    const exchangeRequest = await exchangeService.createExchangeRequest(req.user._id, req.body);
    return ApiResponse.success(res, 'Exchange request sent successfully', { exchangeRequest }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getRequests = async (req, res, next) => {
  try {
    const requests = await exchangeService.getUserExchangeRequests(req.user._id);
    return ApiResponse.success(res, 'Exchange requests retrieved', requests);
  } catch (error) {
    next(error);
  }
};

export const acceptRequest = async (req, res, next) => {
  try {
    const result = await exchangeService.acceptExchangeRequest(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Exchange request accepted! Connection established.', result);
  } catch (error) {
    next(error);
  }
};

export const declineRequest = async (req, res, next) => {
  try {
    const result = await exchangeService.declineExchangeRequest(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Exchange request declined', result);
  } catch (error) {
    next(error);
  }
};

export const getConnections = async (req, res, next) => {
  try {
    const connections = await exchangeService.getUserConnections(req.user._id);
    return ApiResponse.success(res, 'Active connections retrieved', { connections });
  } catch (error) {
    next(error);
  }
};

