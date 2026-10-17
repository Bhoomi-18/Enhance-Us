import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore session on app launch
  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      if (response && response.data && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('enhanceus_auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const handleLogin = async (credentials) => {
    const response = await authService.login(credentials);
    if (response && response.data) {
      const { user: userData, token } = response.data;
      if (token) {
        localStorage.setItem('enhanceus_auth_token', token);
      }
      setUser(userData);
      setIsAuthenticated(true);
      return response;
    }
  };

  const handleRegister = async (userDataInput) => {
    const response = await authService.register(userDataInput);
    if (response && response.data) {
      const { user: userData, token } = response.data;
      if (token) {
        localStorage.setItem('enhanceus_auth_token', token);
      }
      setUser(userData);
      setIsAuthenticated(true);
      return response;
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('[Logout Error]', error);
    } finally {
      localStorage.removeItem('enhanceus_auth_token');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
