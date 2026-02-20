// Protected Route Component
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, checkAuth } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(!location.state?.user);

  useEffect(() => {
    // If user data was passed from AuthCallback, skip auth check
    if (location.state?.user) {
      setIsChecking(false);
      return;
    }

    // Otherwise, verify session with server
    const verify = async () => {
      await checkAuth();
      setIsChecking(false);
    };
    verify();
  }, [location.state, checkAuth]);

  // Show loading while checking auth
  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="protected-loading">
        <div className="text-center">
          <Crown className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <Loader2 className="w-6 h-6 text-primary mx-auto animate-spin" />
        </div>
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
