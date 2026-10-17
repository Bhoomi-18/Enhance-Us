import { ApiError } from '../utils/apiError.js';

export const validateGoalInput = ({ title, description }) => {
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Goal title is required');
  } else if (title.trim().length > 200) {
    errors.push('Goal title cannot exceed 200 characters');
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Goal description is required');
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Validation Error', errors);
  }
};
