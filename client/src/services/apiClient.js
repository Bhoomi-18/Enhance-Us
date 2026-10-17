import axios from 'axios';
import { API_BASE_URL } from '../constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial for HTTP-only cookies
  timeout: 10000,
});

// Request Interceptor to attach Authorization header if token exists in localStorage fallback
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('enhanceus_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for consistent error payload extraction
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const formattedError = {
      message: error.response?.data?.message || error.message || 'Network error occurred',
      statusCode: error.response?.status || 500,
      details: error.response?.data?.errors || null,
      raw: error,
    };
    return Promise.reject(formattedError);
  }
);

export default apiClient;
