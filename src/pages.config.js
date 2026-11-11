/**
 * pages.config.js - Page routing configuration
 * 
 * Maintained by hand. Every page is loaded on demand with React.lazy; App.jsx
 * wraps the routes in Suspense. Add a page here and, if it is admin-only, to
 * ADMIN_PAGES in App.jsx.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';

// One loader per page. React.lazy keeps each page in its own chunk, and
// preloadPages lets the app fetch those chunks in the background after sign-in
// so moving between sections does not wait on the network.
const loaders = {
    AdminContent: () => import('./pages/AdminContent'),
    AdminHome: () => import('./pages/AdminHome'),
    AdminJsonManager: () => import('./pages/AdminJsonManager'),
    AdminProgress: () => import('./pages/AdminProgress'),
    AdminStudentDetail: () => import('./pages/AdminStudentDetail'),
    AdminStudents: () => import('./pages/AdminStudents'),
    AdminTasks: () => import('./pages/AdminTasks'),
    AdminTrash: () => import('./pages/AdminTrash'),
    Adivino: () => import('./pages/Adivino'),
    Badges: () => import('./pages/Badges'),
    CourseManagement: () => import('./pages/CourseManagement'),
    Home: () => import('./pages/Home'),
    Leaderboard: () => import('./pages/Leaderboard'),
    MyTasks: () => import('./pages/MyTasks'),
    Progress: () => import('./pages/Progress'),
    Quizzes: () => import('./pages/Quizzes'),
    index: () => import('./pages/index'),
};

export const PAGES = Object.fromEntries(
    Object.entries(loaders).map(([name, load]) => [name, lazy(load)])
);

export const preloadPages = (names) => {
    names.forEach((name) => { loaders[name]?.().catch(() => {}); });
};

export const pagesConfig = {
    mainPage: "Quizzes",
    Pages: PAGES,
};
