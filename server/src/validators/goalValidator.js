import { ApiError } from '../utils/apiError.js';

export const validateGoalInput = ({ title, description }) => {
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Goal title is required');
  } else if (title.trim().length < 3) {
    errors.push('Goal title must be at least 3 characters long');
  } else if (title.trim().length > 200) {
    errors.push('Goal title cannot exceed 200 characters');
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Goal description is required');
  } else if (description.trim().length < 10) {
    errors.push('Goal description must be at least 10 characters long to provide sufficient context for AI decomposition');
  } else if (description.trim().length > 2000) {
    errors.push('Goal description cannot exceed 2000 characters');
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Validation Error', errors);
  }
};

export const validateGoalAnalysisInput = ({ description }) => {
  const errors = [];

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Goal description is required for analysis');
  } else if (description.trim().length < 10) {
    errors.push('Goal description must be at least 10 characters long to provide sufficient context for AI decomposition');
  } else if (description.trim().length > 2000) {
    errors.push('Goal description cannot exceed 2000 characters');
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Validation Error', errors);
  }
};
