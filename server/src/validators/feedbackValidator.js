import { ApiError } from '../utils/apiError.js';

/**
 * Sanitizes text to prevent HTML injection and strips carriage control characters
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '') // Strip angle brackets
    .trim();
};

export const validateFeedbackInput = (body = {}) => {
  const errors = [];

  // 1. Rating: required integer between 1 and 5
  const ratingNum = Number(body.rating);
  if (
    body.rating === undefined ||
    body.rating === null ||
    isNaN(ratingNum) ||
    !Number.isInteger(ratingNum) ||
    ratingNum < 1 ||
    ratingNum > 5
  ) {
    errors.push('Rating is required and must be an integer between 1 and 5');
  }

  // 2. Improvements: optional, max 1000 characters
  if (body.improvements !== undefined && body.improvements !== null) {
    if (typeof body.improvements !== 'string') {
      errors.push('Improvements field must be a text string');
    } else if (body.improvements.length > 1000) {
      errors.push('Improvements text cannot exceed 1000 characters');
    }
  }

  // 3. New Features: optional, max 1000 characters
  if (body.newFeatures !== undefined && body.newFeatures !== null) {
    if (typeof body.newFeatures !== 'string') {
      errors.push('New features field must be a text string');
    } else if (body.newFeatures.length > 1000) {
      errors.push('New features text cannot exceed 1000 characters');
    }
  }

  // 4. Comments: optional, max 1000 characters
  if (body.comments !== undefined && body.comments !== null) {
    if (typeof body.comments !== 'string') {
      errors.push('Comments field must be a text string');
    } else if (body.comments.length > 1000) {
      errors.push('Comments text cannot exceed 1000 characters');
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Feedback Validation Failed', errors);
  }

  return {
    rating: ratingNum,
    improvements: sanitizeText(body.improvements),
    newFeatures: sanitizeText(body.newFeatures),
    comments: sanitizeText(body.comments),
  };
};

export default {
  validateFeedbackInput,
};
