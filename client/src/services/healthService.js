import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants';

export const checkHealth = async () => {
  return await apiClient.get(API_ENDPOINTS.HEALTH);
};
