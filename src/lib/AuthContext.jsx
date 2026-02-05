import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const localToken = localStorage.getItem('base44_mock_token');
      if (localToken) {
        // If we have a local mock token, skip public settings check and go straight to auth
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
        return;
      }

      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        // If we got the app public settings successfully, check if user is authenticated
        // Check for local mock token first
        const localToken = localStorage.getItem('base44_mock_token');
        if (appParams.token || localToken) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);

        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);

      const localToken = localStorage.getItem('base44_mock_token');

      if (localToken) {
        // Mock user based on token
        const mockUser = JSON.parse(localToken);
        setUser(mockUser);
        setIsAuthenticated(true);
      } else {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
      }
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);

      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const login = async (email, password) => {
    console.log('Login Attempt:', { email, password });
    setIsLoadingAuth(true);
    // Hardcoded credentials for development
    if (email === 'admin' && password === 'admin') {
      const adminUser = {
        id: 'admin_123',
        email: 'admin@base44.com',
        last_name: 'User',
        is_admin: true,
        username: 'admin',
        role: 'admin'
      };
      localStorage.setItem('base44_mock_token', JSON.stringify(adminUser));
      setUser(adminUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(false);
      return true;
    } else if (email === 'student' && password === 'student') {
      const studentUser = {
        id: 'student_123',
        email: 'student@base44.com',
        last_name: 'User',
        is_admin: false,
        username: 'student',
        role: 'student'
      };
      localStorage.setItem('base44_mock_token', JSON.stringify(studentUser));
      setUser(studentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(false);
      return true;
    }

    setIsLoadingAuth(false);
    return false;
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('base44_mock_token');

    if (shouldRedirect) {
      // If we are using mock auth, just reload to clear state and show login
      window.location.href = '/login';
      // Use the SDK's logout method which handles token cleanup and redirect
      // base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Redirect to local login page
    window.location.href = '/login';
    // Use the SDK's redirectToLogin method
    // base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      login
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
