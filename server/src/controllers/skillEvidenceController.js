import * as skillEvidenceService from '../services/skillEvidenceService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const addOrUpdateEvidence = async (req, res, next) => {
  try {
    const { skillName } = req.params;

    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.addOrUpdateSkillEvidence(
        req.user.workspaceId,
        skillName,
        req.body
      );
      return ApiResponse.success(res, 'Evidence submitted for review successfully', result, HTTP_STATUS.OK);
    }

    const result = await skillEvidenceService.addOrUpdateSkillEvidence(
      req.user._id,
      skillName,
      req.body
    );
    return ApiResponse.success(res, 'Evidence submitted for review successfully', result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const deleteEvidence = async (req, res, next) => {
  try {
    const { skillName } = req.params;

    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.deleteSkillEvidence(
        req.user.workspaceId,
        skillName
      );
      return ApiResponse.success(res, 'Skill evidence removed successfully', result, HTTP_STATUS.OK);
    }

    const result = await skillEvidenceService.deleteSkillEvidence(
      req.user._id,
      skillName
    );
    return ApiResponse.success(res, 'Skill evidence removed successfully', result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const getEvidenceQueue = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const queue = await demoWorkspaceService.getPendingEvidenceSkills(req.user.workspaceId);
      return ApiResponse.success(res, 'Verification queue retrieved', { queue }, HTTP_STATUS.OK);
    }

    const queue = await skillEvidenceService.getAdminEvidenceQueue(req.query);
    return ApiResponse.success(res, 'Verification queue retrieved', { queue }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const moderateEvidence = async (req, res, next) => {
  try {
    const { userId, skillName } = req.params;

    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.moderateSkillEvidence(
        req.user.workspaceId,
        userId,
        skillName,
        req.body,
        req.user
      );
      return ApiResponse.success(res, 'Skill evidence moderated successfully', result, HTTP_STATUS.OK);
    }

    const result = await skillEvidenceService.moderateSkillEvidence(
      req.user,
      userId,
      skillName,
      req.body
    );
    return ApiResponse.success(res, 'Skill evidence moderated successfully', result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export default {
  addOrUpdateEvidence,
  deleteEvidence,
  getEvidenceQueue,
  moderateEvidence,
};
