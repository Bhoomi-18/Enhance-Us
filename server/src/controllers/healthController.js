import { ApiResponse } from '../utils/apiResponse.js';
import * as healthService from '../services/healthService.js';
import { HTTP_STATUS } from '../constants/index.js';

export const getHealth = async (req, res, next) => {
  try {
    const statusInfo = await healthService.getHealthStatus();
    return ApiResponse.success(res, 'EnhanceUs API is running', statusInfo, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
