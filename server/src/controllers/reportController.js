import * as reportService from '../services/reportService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createReport = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.createReport(
        req.user.workspaceId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, result.message, result, HTTP_STATUS.CREATED);
    }

    const result = await reportService.createReport(req.user._id, req.body);
    return ApiResponse.success(res, result.message, result, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const reports = await demoWorkspaceService.getReports(req.user.workspaceId, req.query);
      return ApiResponse.success(res, 'Reports retrieved successfully', { reports }, HTTP_STATUS.OK);
    }

    const reports = await reportService.getReports(req.query);
    return ApiResponse.success(res, 'Reports retrieved successfully', { reports }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const getReportById = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const report = await demoWorkspaceService.getReportById(req.user.workspaceId, req.params.id);
      return ApiResponse.success(res, 'Report retrieved successfully', { report }, HTTP_STATUS.OK);
    }

    const report = await reportService.getReportById(req.params.id);
    return ApiResponse.success(res, 'Report retrieved successfully', { report }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const moderateReport = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const report = await demoWorkspaceService.moderateReport(
        req.user.workspaceId,
        req.params.id,
        req.body,
        req.user
      );
      return ApiResponse.success(res, 'Report moderated successfully', { report }, HTTP_STATUS.OK);
    }

    const report = await reportService.moderateReport(req.user, req.params.id, req.body);
    return ApiResponse.success(res, 'Report moderated successfully', { report }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export default {
  createReport,
  getReports,
  getReportById,
  moderateReport,
};
