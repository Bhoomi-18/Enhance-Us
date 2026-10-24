import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { BASELINE_VERSION } from '../fixtures/canonicalDemoBaseline.js';

/**
 * Resets the calling visitor's isolated workspace back to the canonical baseline.
 * Enforces explicit confirmation and demo authorization.
 */
export const resetDemoWorkspace = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isDemo || !req.user.workspaceId) {
      throw new ApiError(403, 'Demo workspace reset is only available for active demo sessions');
    }

    const { confirm } = req.body || {};
    if (!confirm) {
      throw new ApiError(400, 'Explicit confirmation ({ confirm: true }) is required to reset demo workspace');
    }

    const result = await demoWorkspaceService.resetWorkspace(req.user.workspaceId, confirm);
    return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Returns status, version, and tour configuration for the calling demo workspace.
 */
export const getDemoStatus = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isDemo || !req.user.workspaceId) {
      throw new ApiError(403, 'Demo status is only available for active demo sessions');
    }

    const tourStatus = await demoWorkspaceService.getTourStatus(req.user.workspaceId);
    return ApiResponse.success(
      res,
      'Demo workspace status',
      {
        isDemo: true,
        workspaceId: req.user.workspaceId,
        version: BASELINE_VERSION,
        tourDismissed: tourStatus.tourDismissed,
      },
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Dismisses the onboarding tour for the current visitor's workspace.
 */
export const dismissDemoTour = async (req, res, next) => {
  try {
    if (!req.user || !req.user.isDemo || !req.user.workspaceId) {
      throw new ApiError(403, 'Demo tour management is only available for active demo sessions');
    }

    const result = await demoWorkspaceService.dismissTour(req.user.workspaceId);
    return ApiResponse.success(res, 'Demo tour dismissed', result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Returns canonical baseline version metadata (public read-only inspection)
 */
export const getBaselineMetadata = async (req, res, next) => {
  try {
    return ApiResponse.success(
      res,
      'Canonical baseline metadata',
      {
        version: BASELINE_VERSION,
        isolatedWorkspacesEnabled: true,
        ttlHours: 24,
      },
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};
