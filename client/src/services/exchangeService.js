import apiClient from './apiClient';

export const sendExchangeRequest = async (requestData) => {
  return await apiClient.post('/exchanges/request', requestData);
};

export const getExchangeRequests = async () => {
  return await apiClient.get('/exchanges/requests');
};

export const acceptExchangeRequest = async (id) => {
  return await apiClient.post(`/exchanges/requests/${id}/accept`);
};

export const declineExchangeRequest = async (id) => {
  return await apiClient.post(`/exchanges/requests/${id}/decline`);
};

export const getConnections = async () => {
  return await apiClient.get('/exchanges/connections');
};

export const getPendingRequestStatus = async (peerId) => {
  return await apiClient.get(`/exchanges/pending-status/${peerId}`);
};

