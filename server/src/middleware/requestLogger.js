import morgan from 'morgan';
import config from '../config/env.js';

// Development format: :method :url :status :response-time ms - :res[content-length]
export const requestLogger = morgan(
  config.nodeEnv === 'development' ? 'dev' : 'combined'
);

export default requestLogger;
