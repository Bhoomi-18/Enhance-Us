import { ApiError } from '../utils/apiError.js';

export const validateAccountDeletionInput = (body = {}) => {
  const errors = [];

  if (!body.password || typeof body.password !== 'string' || body.password.trim().length === 0) {
    errors.push('Your account password is required to verify identity before deletion');
  }

  if (!body.confirmationPhrase || typeof body.confirmationPhrase !== 'string') {
    errors.push('You must type the confirmation phrase DELETE to proceed');
  } else if (body.confirmationPhrase.trim() !== 'DELETE') {
    errors.push('Confirmation phrase mismatch. Please type exactly DELETE');
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Account Deletion Validation Failed', errors);
  }
};

export default {
  validateAccountDeletionInput,
};
