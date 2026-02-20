// Auth Context for CrownFlow
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      // CRITICAL: If returning from OAuth callback, skip the /me check.
      // AuthCallback will exchange the session_id and establish the session first.
      if (window.location.hash?.includes('session_id=')) {
        setLoading(false);
        return;
      }

      const data = await authApi.getMe();
      setUser(data.user);
      setBusiness(data.business);
    } catch (err) {
      // Not authenticated - this is expected
      setUser(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleAuthCallback = async (sessionId) => {
    try {
      setLoading(true);
      const data = await authApi.exchangeSession(sessionId);
      setUser(data.user);
      setBusiness(data.business);
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao autenticar');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setBusiness(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateBusiness = (newBusiness) => {
    setBusiness(newBusiness);
  };

  const value = {
    user,
    business,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    handleAuthCallback,
    updateBusiness,
    checkAuth,
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
