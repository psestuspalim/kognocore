import React, { createContext, useState, useContext, useEffect } from 'react';
import { client } from '@/api/client';
import { appParams } from '@/lib/app-params';
import { getOrCreateLearnerId, getOrCreateStudentAlias } from '@/lib/learner-id';

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

  const syncUserRecord = async (userData) => {
    try {
      if (!userData?.email) return;
      const allUsers = await client.entities.User.list();
      const existing = allUsers.find(
        (u) => u.email === userData.email || (userData.learner_id && u.learner_id === userData.learner_id)
      );

      const payload = {
        email: userData.email,
        username: userData.username || userData.full_name || 'Usuario',
        full_name: userData.full_name || userData.username || 'Usuario',
        role: userData.role || 'user',
        learner_id: userData.learner_id || null
      };

      if (!existing) {
        await client.entities.User.create(payload);
      } else {
        await client.entities.User.update(existing.id, payload);
      }
    } catch (_err) {
      // keep auth flow resilient
    }
  };

  const checkAppState = async () => {
    const safeJson = async (response) => {
      const text = await response.text();
      try {
        return text ? JSON.parse(text) : {};
      } catch (_e) {
        return { raw: text };
      }
    };

    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const localToken = localStorage.getItem('app_mock_token');
      const kcToken = localStorage.getItem('kc_token');

      if (localToken || kcToken) {
        // If we have a local mock token or Vercel token, skip public settings check and go straight to auth
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
        return;
      }

      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      try {
        const headers = {
          'Content-Type': 'application/json',
          'X-App-Id': appParams.appId
        };
        if (appParams.token) {
          headers['Authorization'] = `Bearer ${appParams.token}`;
        }

        const response = await fetch(`${appParams.serverUrl}/api/apps/public/prod/public-settings/by-id/${appParams.appId}`, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok) {
          const errorData = await safeJson(response);
          const error = new Error(errorData.message || response.statusText);
          error.status = response.status;
          error.data = errorData;
          throw error;
        }

        const publicSettings = await safeJson(response);
        setAppPublicSettings(publicSettings);

        // If we got the app public settings successfully, check if user is authenticated
        // Check for local mock token or Vercel token first
        const localToken = localStorage.getItem('app_mock_token');
        const kcToken = localStorage.getItem('kc_token');
        if (appParams.token || localToken || kcToken) {
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

      const localToken = localStorage.getItem('app_mock_token');
      const kcToken = localStorage.getItem('kc_token');

      if (kcToken) {
        // Validation using Vercel backend
        const response = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${kcToken}` }
        });

        if (response.ok) {
          const data = await response.json();
          const learnerId = getOrCreateLearnerId();
          const studentAlias = getOrCreateStudentAlias();
          const resolvedUser = {
            id: `student_${learnerId.slice(0, 8)}`,
            email: `learner+${learnerId}@kognocore.local`,
            last_name: 'Usuario',
            username: studentAlias,
            full_name: studentAlias,
            is_admin: false,
            role: 'user',
            courseId: data.courseId,
            learner_id: learnerId
          };
          setUser(resolvedUser);
          await syncUserRecord(resolvedUser);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
          return;
        } else {
          // Invalid token, remove it
          localStorage.removeItem('kc_token');
        }
      }

      if (localToken) {
        // Mock user based on token
        const parsed = JSON.parse(localToken);
        const learnerId = parsed.learner_id || getOrCreateLearnerId();
        const studentAlias = parsed.role === 'admin' ? parsed.username : getOrCreateStudentAlias();
        const mockUser = {
          ...parsed,
          learner_id: learnerId,
          username: parsed.role === 'admin' ? parsed.username : studentAlias,
          full_name: parsed.role === 'admin' ? parsed.full_name : studentAlias,
          role: parsed.role === 'admin' ? 'admin' : 'user'
        };
        localStorage.setItem('app_mock_token', JSON.stringify(mockUser));
        setUser(mockUser);
        await syncUserRecord(mockUser);
        setIsAuthenticated(true);
      } else {
        const currentUser = await client.auth.me();
        setUser(currentUser);
        await syncUserRecord(currentUser);
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

    const rawId = (email || '').trim().toLowerCase();
    const identifier = rawId.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleanPassword = (password || '').trim();

    const isJesus = identifier === 'jesus' || identifier === 'jesus@kognocore.com' || identifier === 'admin' || identifier === 'admin@kognocore.com' || identifier === 'admin@client.com';
    const isPassValid = cleanPassword === '112358*' || cleanPassword === '112358' || cleanPassword === 'admin';

    if (isJesus && isPassValid) {
      const adminUser = {
        id: 'admin_jesus',
        email: identifier.includes('@') ? identifier : 'jesus@kognocore.com',
        last_name: 'Admin',
        full_name: 'Jesús',
        is_admin: true,
        username: 'jesus',
        role: 'admin'
      };
      localStorage.setItem('app_mock_token', JSON.stringify(adminUser));
      setUser(adminUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(false);
      return true;
    } else if (email === 'student' && password === 'student') {
      const learnerId = getOrCreateLearnerId();
      const studentUser = {
        id: `student_${learnerId.slice(0, 8)}`,
        email: `learner+${learnerId}@kognocore.local`,
        last_name: 'User',
        is_admin: false,
        username: 'student',
        role: 'user',
        learner_id: learnerId
      };
      localStorage.setItem('app_mock_token', JSON.stringify(studentUser));
      setUser(studentUser);
      syncUserRecord(studentUser);
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
    localStorage.removeItem('app_mock_token');
    localStorage.removeItem('kc_token');

    if (shouldRedirect) {
      // If we are using mock auth, just reload to clear state and show login
      window.location.href = '/login';
      // Use the SDK's logout method which handles token cleanup and redirect
      // client.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      client.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Redirect to local login page
    window.location.href = '/login';
    // Use the SDK's redirectToLogin method
    // client.auth.redirectToLogin(window.location.href);
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
