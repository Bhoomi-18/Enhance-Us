export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'EnhanceUs';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  GOALS: '/goals',
  MATCHES: '/matches',
  MESSAGES: '/messages',
  SETTINGS: '/settings',
};

export const API_ENDPOINTS = {
  HEALTH: '/health',
};
