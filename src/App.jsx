import './App.css'
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Login from '@/pages/Login';
import AdminQuestionReviews from '@/pages/AdminQuestionReviews';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const ADMIN_PAGES = new Set([
  'AdminContent',
  'AdminHome',
  'AdminJsonManager',
  'AdminProgress',
  'AdminStudentDetail',
  'AdminStudents',
  'AdminTasks',
  'AdminTrash',
  'CourseManagement'
]);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, user } = useAuth();

  const queryClient = useQueryClient();
  const lastRevisions = useRef('');
  const { data: correctionQuizzes } = useQuery({
    queryKey: ['quizzes'], queryFn: () => client.entities.Quiz.list('-created_date'),
    enabled: isAuthenticated, refetchInterval: 15000, refetchOnWindowFocus: true
  });
  useEffect(() => {
    if (!correctionQuizzes) return;
    const revisions = correctionQuizzes.filter(q => q.review_revision).map(q => q.id + ':' + q.review_revision).sort().join('|');
    if (revisions !== lastRevisions.current) {
      lastRevisions.current = revisions;
      queryClient.invalidateQueries({ predicate: query => query.queryKey[0] !== 'quizzes' });
    }
  }, [correctionQuizzes, queryClient]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
          <span className="text-sm text-slate-500">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={user?.role === 'admin' ? '/AdminHome' : '/'} replace /> : <Login />}
      />
      <Route path="/" element={
        <ProtectedRoute>
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        </ProtectedRoute>
      } />
      {Object.entries(Pages)
        .map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <ProtectedRoute allowedRoles={ADMIN_PAGES.has(path) ? ['admin'] : undefined}>
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
        ))}
      <Route path="/AdminQuestionReviews" element={<ProtectedRoute allowedRoles={['admin']}><AdminQuestionReviews /></ProtectedRoute>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
