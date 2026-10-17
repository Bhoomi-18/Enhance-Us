import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkHealth } from '../services/healthService';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const fetchHealth = useCallback(async () => {
    setIsHealthLoading(true);
    setHealthError(null);
    try {
      const response = await checkHealth();
      setHealthStatus(response);
    } catch (err) {
      setHealthError(err.message || 'Failed to connect to backend server');
      setHealthStatus(null);
    } finally {
      setIsHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const value = {
    healthStatus,
    isHealthLoading,
    healthError,
    refetchHealth: fetchHealth,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
