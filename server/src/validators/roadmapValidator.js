import mongoose from 'mongoose';
import { ApiError } from '../utils/apiError.js';

export const validateRoadmapGenerationInput = (goalId, body = {}) => {
  const errors = [];

  const isValidId =
    (process.env.MOCK_DB === 'true' && typeof goalId === 'string' && goalId.startsWith('mock_goal_')) ||
    (goalId && mongoose.Types.ObjectId.isValid(goalId));

  if (!isValidId) {
    errors.push('A valid goal ID is required to generate a roadmap');
  }

  if (
    body.timeCommitmentHoursPerWeek !== undefined &&
    body.timeCommitmentHoursPerWeek !== null &&
    body.timeCommitmentHoursPerWeek !== ''
  ) {
    const hours = Number(body.timeCommitmentHoursPerWeek);
    if (isNaN(hours) || hours <= 0 || hours > 100) {
      errors.push('Weekly time commitment must be a positive number between 1 and 100 hours');
    }
  }

  if (body.targetOutcome && typeof body.targetOutcome === 'string' && body.targetOutcome.length > 500) {
    errors.push('Target outcome context cannot exceed 500 characters');
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Roadmap Validation Error', errors);
  }
};
