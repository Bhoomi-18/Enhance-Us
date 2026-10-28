import * as workspaceService from '../services/workspaceService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createWorkspace = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const workspace = await demoWorkspaceService.createCollaborativeWorkspace(
        req.user.workspaceId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, 'Collaborative workspace created successfully', { workspace }, HTTP_STATUS.CREATED);
    }

    const workspace = await workspaceService.createWorkspace(req.user._id, req.body);
    return ApiResponse.success(res, 'Collaborative workspace created successfully', { workspace }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getUserWorkspaces = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const data = await demoWorkspaceService.getUserCollaborativeWorkspaces(req.user.workspaceId);
      return ApiResponse.success(res, 'Workspaces retrieved successfully', data);
    }

    const data = await workspaceService.getUserWorkspaces(req.user._id);
    return ApiResponse.success(res, 'Workspaces retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export const getDiscoverableWorkspaces = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const workspaces = await demoWorkspaceService.getDiscoverableCollaborativeWorkspaces(req.user.workspaceId, req.query);
      return ApiResponse.success(res, 'Discoverable workspaces retrieved', { workspaces });
    }

    const workspaces = await workspaceService.getDiscoverableWorkspaces(req.user._id, req.query);
    return ApiResponse.success(res, 'Discoverable workspaces retrieved', { workspaces });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceById = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const workspace = await demoWorkspaceService.getCollaborativeWorkspaceById(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, 'Workspace details retrieved', { workspace });
    }

    const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Workspace details retrieved', { workspace });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const workspace = await demoWorkspaceService.updateCollaborativeWorkspace(
        req.user.workspaceId,
        req.params.id,
        req.body,
        req.user
      );
      return ApiResponse.success(res, 'Workspace updated successfully', { workspace });
    }

    const workspace = await workspaceService.updateWorkspace(req.params.id, req.user._id, req.body);
    return ApiResponse.success(res, 'Workspace updated successfully', { workspace });
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;

    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.inviteCollaborativeMember(
        req.user.workspaceId,
        req.params.id,
        targetUserId,
        req.user
      );
      return ApiResponse.success(res, result.message, result);
    }

    const result = await workspaceService.inviteMember(req.params.id, req.user._id, targetUserId);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const respondToInvitation = async (req, res, next) => {
  try {
    const response = req.body.response || req.body.action;

    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.respondToCollaborativeInvitation(
        req.user.workspaceId,
        req.params.id,
        response,
        req.user
      );
      return ApiResponse.success(res, result.message, result);
    }

    const result = await workspaceService.respondToInvitation(req.params.id, req.user._id, response);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.removeCollaborativeMember(
        req.user.workspaceId,
        req.params.id,
        req.params.memberId,
        req.user
      );
      return ApiResponse.success(res, result.message, result);
    }

    const result = await workspaceService.removeMember(req.params.id, req.user._id, req.params.memberId);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const addMilestone = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const milestone = await demoWorkspaceService.addCollaborativeMilestone(
        req.user.workspaceId,
        req.params.id,
        req.body,
        req.user
      );
      const workspace = await demoWorkspaceService.getCollaborativeWorkspaceById(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, 'Milestone added successfully', { milestone, workspace }, HTTP_STATUS.CREATED);
    }

    const milestone = await workspaceService.addMilestone(req.params.id, req.user._id, req.body);
    const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Milestone added successfully', { milestone, workspace }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const updateMilestone = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const milestone = await demoWorkspaceService.updateCollaborativeMilestone(
        req.user.workspaceId,
        req.params.id,
        req.params.milestoneId,
        req.body,
        req.user
      );
      const workspace = await demoWorkspaceService.getCollaborativeWorkspaceById(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, 'Milestone updated successfully', { milestone, workspace });
    }

    const milestone = await workspaceService.updateMilestone(
      req.params.id,
      req.user._id,
      req.params.milestoneId,
      req.body
    );
    const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Milestone updated successfully', { milestone, workspace });
  } catch (error) {
    next(error);
  }
};

export const deleteMilestone = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.deleteCollaborativeMilestone(
        req.user.workspaceId,
        req.params.id,
        req.params.milestoneId,
        req.user
      );
      const workspace = await demoWorkspaceService.getCollaborativeWorkspaceById(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, result.message, { ...result, workspace });
    }

    const result = await workspaceService.deleteMilestone(req.params.id, req.user._id, req.params.milestoneId);
    const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
    return ApiResponse.success(res, result.message, { ...result, workspace });
  } catch (error) {
    next(error);
  }
};

export const addResource = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const resource = await demoWorkspaceService.addCollaborativeResource(
        req.user.workspaceId,
        req.params.id,
        req.body,
        req.user
      );
      const workspace = await demoWorkspaceService.getCollaborativeWorkspaceById(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, 'Resource shared successfully', { resource, workspace }, HTTP_STATUS.CREATED);
    }

    const resource = await workspaceService.addResource(req.params.id, req.user._id, req.body);
    const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Resource shared successfully', { resource, workspace }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.deleteCollaborativeResource(
        req.user.workspaceId,
        req.params.id,
        req.params.resourceId,
        req.user
      );
      const workspace = await demoWorkspaceService.getCollaborativeWorkspaceById(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, result.message, { ...result, workspace });
    }

    const result = await workspaceService.deleteResource(req.params.id, req.user._id, req.params.resourceId);
    const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
    return ApiResponse.success(res, result.message, { ...result, workspace });
  } catch (error) {
    next(error);
  }
};

export const updateNotes = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (req.user?.isDemo && req.user?.workspaceId) {
      const notes = await demoWorkspaceService.updateCollaborativeNotes(
        req.user.workspaceId,
        req.params.id,
        content,
        req.user
      );
      const workspace = await demoWorkspaceService.getCollaborativeWorkspaceById(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, 'Workspace notes updated successfully', { notes, workspace });
    }

    const notes = await workspaceService.updateNotes(req.params.id, req.user._id, content);
    const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Workspace notes updated successfully', { notes, workspace });
  } catch (error) {
    next(error);
  }
};

export const addDiscussionMessage = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (req.user?.isDemo && req.user?.workspaceId) {
      const message = await demoWorkspaceService.addCollaborativeDiscussionMessage(
        req.user.workspaceId,
        req.params.id,
        content,
        req.user
      );
      const workspace = await demoWorkspaceService.getCollaborativeWorkspaceById(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, 'Message posted successfully', { message, workspace }, HTTP_STATUS.CREATED);
    }

    const message = await workspaceService.addDiscussionMessage(req.params.id, req.user._id, content);
    const workspace = await workspaceService.getWorkspaceById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Message posted successfully', { message, workspace }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export default {
  createWorkspace,
  getUserWorkspaces,
  getDiscoverableWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  inviteMember,
  respondToInvitation,
  removeMember,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  addResource,
  deleteResource,
  updateNotes,
  addDiscussionMessage,
};
