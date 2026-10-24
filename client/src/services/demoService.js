import apiClient from './apiClient';

/**
 * Resets the active visitor's isolated demo workspace back to the canonical baseline.
 */
export const resetDemoWorkspace = async () => {
  const response = await apiClient.post('/demo/reset', { confirm: true });
  return response.data;
};

/**
 * Retrieves the current visitor's workspace status and version.
 */
export const getDemoStatus = async () => {
  const response = await apiClient.get('/demo/status');
  return response.data;
};

/**
 * Dismisses the onboarding tour for this demo workspace.
 */
export const dismissDemoTour = async () => {
  const response = await apiClient.post('/demo/tour-dismiss');
  return response.data;
};

/**
 * Returns canonical baseline metadata.
 */
export const getBaselineMetadata = async () => {
  const response = await apiClient.get('/demo/baseline');
  return response.data;
};
