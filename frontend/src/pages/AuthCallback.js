// Auth Callback Page - Handles OAuth redirect
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { handleAuthCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Get session_id from URL hash
        const hash = window.location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          console.error('No session_id found in URL');
          navigate('/');
          return;
        }

        const sessionId = sessionIdMatch[1];
        
        // Exchange session_id for user data
        const data = await handleAuthCallback(sessionId);
        
        // Clear the hash from URL and redirect to dashboard with user data
        window.history.replaceState(null, '', '/dashboard');
        navigate('/dashboard', { state: { user: data.user, business: data.business } });
        
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    processAuth();
  }, [handleAuthCallback, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center" data-testid="auth-callback">
      <div className="text-center">
        <Crown className="w-16 h-16 text-primary mx-auto mb-6 animate-pulse" />
        <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin mb-4" />
        <p className="text-muted-foreground">Autenticando...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
