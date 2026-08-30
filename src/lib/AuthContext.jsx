import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateLearnerId, getOrCreateStudentAlias } from '@/lib/learner-id';

const AuthContext = createContext(null);

function buildStudentUser(courseId) {
  const learnerId = getOrCreateLearnerId();
  const studentAlias = getOrCreateStudentAlias();

  return {
    id: `student_${learnerId.slice(0, 8)}`,
    email: `learner+${learnerId}@kognocore.local`,
    last_name: 'Estudiante',
    username: studentAlias,
    full_name: studentAlias,
    is_admin: false,
    role: 'user',
    courseId,
    learner_id: learnerId,
    auth_provider: 'access_code'
  };
}

async function loadAdminProfile(session) {
  if (!session?.user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, username, role')
    .eq('id', session.user.id)
    .single();

  if (error) throw error;

  return {
    id: profile.id,
    email: profile.email || session.user.email,
    full_name: profile.full_name || profile.username || session.user.email,
    username: profile.username || profile.full_name || session.user.email,
    role: profile.role,
    is_admin: profile.role === 'admin',
    auth_provider: 'supabase'
  };
}

async function loadCodeSession() {
  const token = localStorage.getItem('kc_token');
  if (!token) return null;

  const response = await fetch('/api/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    localStorage.removeItem('kc_token');
    return null;
  }

  const data = await response.json();
  return buildStudentUser(data.courseId);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const appliedSessionUser = useRef(null);

  const applySupabaseSession = useCallback(async (session) => {
    if (!session) return false;

    const uid = session.user.id;
    if (appliedSessionUser.current === uid) return true;
    appliedSessionUser.current = uid;

    try {
      const profile = await loadAdminProfile(session);
      if (profile?.role !== 'admin') {
        appliedSessionUser.current = null;
        await supabase.auth.signOut();
        setAuthError({ type: 'forbidden', message: 'Esta cuenta no tiene acceso administrativo.' });
        setUser(null);
        return false;
      }

      localStorage.removeItem('kc_token');
      setUser(profile);
      setAuthError(null);
      return true;
    } catch (error) {
      appliedSessionUser.current = null;
      setAuthError({ type: 'profile_error', message: error.message });
      setUser(null);
      return false;
    }
  }, []);

  const checkAppState = useCallback(async () => {
    setIsLoadingAuth(true);

    try {
      if (window.location.hash.includes('type=recovery')) {
        setPasswordRecovery(true);
        setUser(null);
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session && await applySupabaseSession(session)) return;

      const codeUser = await loadCodeSession();
      setUser(codeUser);
      if (codeUser) setAuthError(null);
    } catch (error) {
      setAuthError({ type: 'auth_error', message: error.message });
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applySupabaseSession]);

  useEffect(() => {
    void checkAppState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
          setUser(null);
          setIsLoadingAuth(false);
        } else if (session) {
          void applySupabaseSession(session).finally(() => setIsLoadingAuth(false));
        } else if (!localStorage.getItem('kc_token')) {
          appliedSessionUser.current = null;
          setUser(null);
          setIsLoadingAuth(false);
        }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [applySupabaseSession, checkAppState]);

  const login = async (email, password) => {
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    if (error) throw error;

    const accepted = await applySupabaseSession(data.session);
    if (!accepted) throw new Error('ADMIN_REQUIRED');
    return true;
  };

  const requestMagicLink = async (email) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new Error('EMAIL_REQUIRED');

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/login`
    });
    if (error) throw error;
  };

  const updatePassword = async (password) => {
    if (!password || password.length < 10) throw new Error('PASSWORD_TOO_SHORT');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    const { data: { session } } = await supabase.auth.getSession();
    const accepted = await applySupabaseSession(session);
    if (!accepted) throw new Error('ADMIN_REQUIRED');

    setPasswordRecovery(false);
    return true;
  };

  const logout = async (shouldRedirect = true) => {
    localStorage.removeItem('kc_token');
    localStorage.removeItem('app_mock_token');
    appliedSessionUser.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setAuthError(null);
    setPasswordRecovery(false);

    if (shouldRedirect) window.location.assign('/login');
  };

  const navigateToLogin = () => window.location.assign('/login');

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: Boolean(user),
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState,
      login,
      requestMagicLink
      ,passwordRecovery
      ,updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
