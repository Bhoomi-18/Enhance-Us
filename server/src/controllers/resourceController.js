import curatedResourceService from '../services/curatedResourceService.js';
import ApiResponse from '../utils/apiResponse.js';

export const getResources = async (req, res, next) => {
  try {
    const { skillName, type } = req.query;
    const userId = req.user ? req.user._id : null;
    const resources = await curatedResourceService.getResourcesForSkill(
      skillName,
      { type },
      userId
    );
    return ApiResponse.success(res, 'Curated learning resources retrieved successfully', {
      resources,
      count: resources.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookmarkedResources = async (req, res, next) => {
  try {
    const resources = await curatedResourceService.getUserBookmarkedResources(req.user._id);
    return ApiResponse.success(res, 'Saved resources retrieved successfully', {
      resources,
      count: resources.length,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleBookmark = async (req, res, next) => {
  try {
    const { resourceId } = req.params;
    const result = await curatedResourceService.toggleBookmark(resourceId, req.user._id);
    const message = result.isBookmarked
      ? 'Resource saved to your bookmarks'
      : 'Resource removed from bookmarks';
    return ApiResponse.success(res, message, result);
  } catch (error) {
    next(error);
  }
};

export const rateResource = async (req, res, next) => {
  try {
    const { resourceId } = req.params;
    const { isUseful } = req.body;
    const result = await curatedResourceService.rateResource(resourceId, req.user._id, isUseful);
    return ApiResponse.success(res, 'Resource rating submitted successfully', result);
  } catch (error) {
    next(error);
  }
};

export default {
  getResources,
  getBookmarkedResources,
  toggleBookmark,
  rateResource,
};
