import { useApp } from '../context/AppContext';

export const useHealth = () => {
  const { healthStatus, isHealthLoading, healthError, refetchHealth } = useApp();
  return {
    healthStatus,
    isHealthLoading,
    healthError,
    refetchHealth,
    isConnected: !!healthStatus?.success,
  };
};

export default useHealth;
