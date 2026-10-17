import { ApiError } from '../utils/apiError.js';
import { HTTP_STATUS, MESSAGES } from '../constants/index.js';

export const notFoundMiddleware = (req, res, next) => {
  const error = new ApiError(
    HTTP_STATUS.NOT_FOUND,
    `Cannot find ${req.originalUrl} on this server`
  );
  next(error);
};

export default notFoundMiddleware;
