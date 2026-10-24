import { validateFeedbackInput } from '../validators/feedbackValidator.js';
import * as feedbackService from '../services/feedbackService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const submitFeedback = async (req, res, next) => {
  try {
    const validatedData = validateFeedbackInput(req.body);

    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.recordFeedback(req.user.workspaceId, validatedData);
      return ApiResponse.success(
        res,
        'Feedback recorded in your demo sandbox. (External email delivery safely simulated).',
        result,
        HTTP_STATUS.OK
      );
    }

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
