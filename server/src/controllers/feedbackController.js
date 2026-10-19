import { validateFeedbackInput } from '../validators/feedbackValidator.js';
import * as feedbackService from '../services/feedbackService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const submitFeedback = async (req, res, next) => {
  try {
    const validatedData = validateFeedbackInput(req.body);

    const result = await feedbackService.sendFeedbackEmail({
      ...validatedData,
      user: req.user || null,
    });

    return ApiResponse.success(
      res,
      'Feedback submitted. Thank you!',
      result,
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

export default {
  submitFeedback,
};
