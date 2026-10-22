import axios from 'axios';
import { API_BASE_URL } from '../constants';

// Cold-start notification subscription system
const coldStartListeners = new Set();
let pendingRequestsCount = 0;
let coldStartTimer = null;
let isColdStarting = false;

const notifyListeners = (state) => {
  isColdStarting = state;
  coldStartListeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.warn('[ColdStart Listener Error]', e);
    }
  });
};

export const subscribeColdStart = (listener) => {
  coldStartListeners.add(listener);
  listener(isColdStarting);
  return () => coldStartListeners.delete(listener);
};

export const getColdStartState = () => isColdStarting;

const onRequestStart = () => {
  pendingRequestsCount += 1;
  if (pendingRequestsCount === 1) {
    // If request takes longer than 2.5s, signal that backend may be cold-starting
    coldStartTimer = setTimeout(() => {
      if (pendingRequestsCount > 0) {
        notifyListeners(true);
      }
    }, 2500);
  }
};

const onRequestFinish = () => {
  pendingRequestsCount = Math.max(0, pendingRequestsCount - 1);
  if (pendingRequestsCount === 0) {
    if (coldStartTimer) {
      clearTimeout(coldStartTimer);
      coldStartTimer = null;
    }
    if (isColdStarting) {
      notifyListeners(false);
    }
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial for HTTP-only cookies
  timeout: 60000, // 60s timeout allows Render free containers (~30-50s cold start) to boot
});

// Request Interceptor: attach token fallback and monitor in-flight request duration
apiClient.interceptors.request.use(
  (config) => {
    onRequestStart();
    const token = localStorage.getItem('enhanceus_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    onRequestFinish();
    return Promise.reject(error);
  }
);

// Response Interceptor: parse payload, format cold-start errors, and prevent duplicate action retries
apiClient.interceptors.response.use(
  (response) => {
    onRequestFinish();
    return response.data;
  },
  (error) => {
    onRequestFinish();

    const isTimeout =
      error.code === 'ECONNABORTED' ||
      (error.message && error.message.toLowerCase().includes('timeout'));
    const isNetworkError =
      !error.response && (error.code === 'ERR_NETWORK' || !window.navigator.onLine);
    const isServerWakingOrUnavailable = [502, 503, 504].includes(error.response?.status);

    let friendlyMessage = error.response?.data?.message || error.message || 'Network error occurred';

    if (isTimeout) {
      friendlyMessage =
        'The server is taking longer than usual to respond. It may be waking up from sleep. Please try again in a few moments.';
    } else if (isNetworkError) {
      friendlyMessage =
        'Unable to connect to EnhanceUs backend. The server may be waking up, or please check your internet connection.';
    } else if (isServerWakingOrUnavailable) {
      friendlyMessage =
        'The server is temporarily starting up. Please refresh or retry in a few moments.';
    }

    const method = (error.config?.method || 'get').toLowerCase();
    const isReadOnly = ['get', 'head', 'options'].includes(method);

    const formattedError = {
      message: friendlyMessage,
      statusCode: error.response?.status || (isTimeout ? 408 : 0),
      details: error.response?.data?.errors || null,
      isTimeout,
      isNetworkError,
      isServerWakingOrUnavailable,
      isRetryable: isReadOnly, // Safe retry only permitted for idempotent read operations
      raw: error,
    };

    return Promise.reject(formattedError);
  }
);

export default apiClient;
