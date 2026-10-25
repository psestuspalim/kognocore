/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
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

const AdminContent = lazy(() => import('./pages/AdminContent'));
const AdminHome = lazy(() => import('./pages/AdminHome'));
const AdminJsonManager = lazy(() => import('./pages/AdminJsonManager'));
const AdminProgress = lazy(() => import('./pages/AdminProgress'));
const AdminStudentDetail = lazy(() => import('./pages/AdminStudentDetail'));
const AdminStudents = lazy(() => import('./pages/AdminStudents'));
const AdminTasks = lazy(() => import('./pages/AdminTasks'));
const AdminTrash = lazy(() => import('./pages/AdminTrash'));
const Adivino = lazy(() => import('./pages/Adivino'));
const Badges = lazy(() => import('./pages/Badges'));
const ChallengePlay = lazy(() => import('./pages/ChallengePlay'));
const CourseManagement = lazy(() => import('./pages/CourseManagement'));
const GameLobby = lazy(() => import('./pages/GameLobby'));
const GamePlay = lazy(() => import('./pages/GamePlay'));
const Home = lazy(() => import('./pages/Home'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const LiveSessions = lazy(() => import('./pages/LiveSessions'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const Progress = lazy(() => import('./pages/Progress'));
const Quizzes = lazy(() => import('./pages/Quizzes'));
const TournamentLobby = lazy(() => import('./pages/TournamentLobby'));
const TournamentPlay = lazy(() => import('./pages/TournamentPlay'));


export const PAGES = {
    "AdminContent": AdminContent,
    "AdminHome": AdminHome,
    "AdminJsonManager": AdminJsonManager,
    "AdminProgress": AdminProgress,
    "AdminStudentDetail": AdminStudentDetail,
    "AdminStudents": AdminStudents,
    "AdminTasks": AdminTasks,
    "AdminTrash": AdminTrash,
    "Adivino": Adivino,
    "Badges": Badges,
    "ChallengePlay": ChallengePlay,
    "CourseManagement": CourseManagement,
    "GameLobby": GameLobby,
    "GamePlay": GamePlay,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "LiveSessions": LiveSessions,
    "MyTasks": MyTasks,
    "Progress": Progress,
    "Quizzes": Quizzes,
    "TournamentLobby": TournamentLobby,
    "TournamentPlay": TournamentPlay,
}

export const pagesConfig = {
    mainPage: "Quizzes",
    Pages: PAGES,
};
