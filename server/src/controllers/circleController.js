import * as circleService from '../services/circleService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getCircles = async (req, res, next) => {
  try {
    const { search, skill, level, policy, onlyMy, page, limit } = req.query;
    const result = await circleService.getCircles(
      { search, skill, level, policy, onlyMy: onlyMy === 'true' },
      { page, limit },
      req.user
    );
    return ApiResponse.success(res, 'Circles retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getCircleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await circleService.getCircleById(id, req.user);
    return ApiResponse.success(res, 'Circle details retrieved', result);
  } catch (error) {
    next(error);
  }
};

export const createCircle = async (req, res, next) => {
  try {
    const circle = await circleService.createCircle(req.user._id, req.body);
    return ApiResponse.created(res, 'Learning circle created successfully', { circle });
  } catch (error) {
    next(error);
  }
};

export const updateCircle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const circle = await circleService.updateCircle(id, req.user._id, req.body);
    return ApiResponse.success(res, 'Circle updated successfully', { circle });
  } catch (error) {
    next(error);
  }
};

export const joinCircle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await circleService.joinCircle(id, req.user._id, req.body);
    const message =
      result.status === 'JOINED'
        ? 'Successfully joined learning circle'
        : 'Join request submitted for review';
    return ApiResponse.success(res, message, result);
  } catch (error) {
    next(error);
  }
};

export const leaveCircle = async (req, res, next) => {
  try {
    const { id } = req.params;
    await circleService.leaveCircle(id, req.user._id);
    return ApiResponse.success(res, 'Successfully left the learning circle');
  } catch (error) {
    next(error);
  }
};

export const manageJoinRequest = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const { action } = req.body;
    const result = await circleService.manageJoinRequest(id, requestId, action, req.user._id);
    return ApiResponse.success(res, `Join request ${action.toLowerCase()}ed`, result);
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;
    const result = await circleService.updateMemberRole(id, userId, role, req.user._id);
    return ApiResponse.success(res, 'Member role updated successfully', result);
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    await circleService.removeMember(id, userId, req.user._id);
    return ApiResponse.success(res, 'Member removed from circle');
  } catch (error) {
    next(error);
  }
};

export const closeCircle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await circleService.closeCircle(id, req.user._id);
    return ApiResponse.success(res, 'Learning circle closed successfully', result);
  } catch (error) {
    next(error);
  }
};

// Collaborative Roadmap
export const addMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const milestone = await circleService.addCircleMilestone(id, req.body, req.user._id);
    return ApiResponse.created(res, 'Milestone added to circle roadmap', { milestone });
  } catch (error) {
    next(error);
  }
};

export const updateMilestone = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;
    const milestone = await circleService.updateCircleMilestone(id, milestoneId, req.body, req.user._id);
    return ApiResponse.success(res, 'Milestone updated', { milestone });
  } catch (error) {
    next(error);
  }
};

export const addTask = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;
    const task = await circleService.addMilestoneTask(id, milestoneId, req.body, req.user._id);
    return ApiResponse.created(res, 'Task added to milestone', { task });
  } catch (error) {
    next(error);
  }
};

export const toggleTask = async (req, res, next) => {
  try {
    const { id, milestoneId, taskId } = req.params;
    const task = await circleService.toggleMilestoneTask(id, milestoneId, taskId, req.user._id);
    return ApiResponse.success(res, 'Task progress updated', { task });
  } catch (error) {
    next(error);
  }
};

// Group Sessions
export const proposeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await circleService.proposeGroupSession(id, req.body, req.user._id);
    return ApiResponse.created(res, 'Group session scheduled successfully', { session });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await circleService.getCircleSessions(id, req.user);
    return ApiResponse.success(res, 'Circle sessions retrieved', result);
  } catch (error) {
    next(error);
  }
};

export const rsvpSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { status, reflection } = req.body;
    const session = await circleService.rsvpGroupSession(sessionId, req.user._id, status, reflection);
    return ApiResponse.success(res, 'RSVP status updated', { session });
  } catch (error) {
    next(error);
  }
};

// Discussions & Announcements
export const getPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;
    const result = await circleService.getCirclePosts(id, req.user, { page, limit });
    return ApiResponse.success(res, 'Circle discussions retrieved', result);
  } catch (error) {
    next(error);
  }
};

export const createPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await circleService.createCirclePost(id, req.user._id, req.body);
    return ApiResponse.created(res, 'Discussion post created', { post });
  } catch (error) {
    next(error);
  }
};

export const addReply = async (req, res, next) => {
  try {
    const { id, postId } = req.params;
    const { content } = req.body;
    const reply = await circleService.addPostReply(id, postId, req.user._id, content);
    return ApiResponse.created(res, 'Reply added', { reply });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const { id, postId } = req.params;
    await circleService.deleteCirclePost(id, postId, req.user._id);
    return ApiResponse.success(res, 'Post deleted successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  getCircles,
  getCircleById,
  createCircle,
  updateCircle,
  joinCircle,
  leaveCircle,
  manageJoinRequest,
  updateMemberRole,
  removeMember,
  closeCircle,
  addMilestone,
  updateMilestone,
  addTask,
  toggleTask,
  proposeSession,
  getSessions,
  rsvpSession,
  getPosts,
  createPost,
  addReply,
  deletePost,
};
