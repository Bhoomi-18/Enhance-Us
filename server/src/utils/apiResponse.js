export class ApiResponse {
  static success(res, message = 'Success', data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res, message = 'An error occurred', statusCode = 500, errors = null, correlationId = null) {
    const response = {
      success: false,
      message,
    };

    const resolvedCorrelationId = correlationId || res.getHeader?.('X-Correlation-Id') || res.req?.correlationId;
    if (resolvedCorrelationId) {
      response.correlationId = resolvedCorrelationId;
    }

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }
}

export default ApiResponse;
