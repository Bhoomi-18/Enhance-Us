import apiClient from './apiClient';

export const getUserPortfolio = async (userId) => {
  return await apiClient.get(`/portfolio/user/${userId}`);
};

export const createPortfolioItem = async (itemData) => {
  return await apiClient.post('/portfolio', itemData);
};

export const updatePortfolioItem = async (itemId, itemData) => {
  return await apiClient.patch(`/portfolio/${itemId}`, itemData);
};

export const deletePortfolioItem = async (itemId) => {
  return await apiClient.delete(`/portfolio/${itemId}`);
};

export const confirmExchangeOutcome = async (data) => {
  return await apiClient.post('/portfolio/confirm-exchange', data);
};

export const createFromMilestone = async (data) => {
  return await apiClient.post('/portfolio/from-milestone', data);
};

export default {
  getUserPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  confirmExchangeOutcome,
  createFromMilestone,
};
