import * as matchingService from '../services/matchingService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getMatches = async (req, res, next) => {
  try {
    const { goalId } = req.query;
    const matches = await matchingService.generateMatchesForUser(req.user._id, goalId);
    return ApiResponse.success(res, 'Matches generated successfully', { matches });
  } catch (error) {
    next(error);
  }
};

export const getMatch = async (req, res, next) => {
  try {
    const match = await matchingService.getMatchById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Match details retrieved', { match });
  } catch (error) {
    next(error);
  }
};
