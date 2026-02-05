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
import AdminContent from './pages/AdminContent';
import AdminHome from './pages/AdminHome';
import AdminJsonManager from './pages/AdminJsonManager';
import AdminProgress from './pages/AdminProgress';
import AdminStudentDetail from './pages/AdminStudentDetail';
import AdminStudents from './pages/AdminStudents';
import AdminTasks from './pages/AdminTasks';
import AdminTrash from './pages/AdminTrash';
import Badges from './pages/Badges';
import ChallengePlay from './pages/ChallengePlay';
import CourseManagement from './pages/CourseManagement';
import GameLobby from './pages/GameLobby';
import GamePlay from './pages/GamePlay';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import LiveSessions from './pages/LiveSessions';
import MyTasks from './pages/MyTasks';
import Progress from './pages/Progress';
import Quizzes from './pages/Quizzes';
import TournamentLobby from './pages/TournamentLobby';
import TournamentPlay from './pages/TournamentPlay';
import index from './pages/index';


export const PAGES = {
    "AdminContent": AdminContent,
    "AdminHome": AdminHome,
    "AdminJsonManager": AdminJsonManager,
    "AdminProgress": AdminProgress,
    "AdminStudentDetail": AdminStudentDetail,
    "AdminStudents": AdminStudents,
    "AdminTasks": AdminTasks,
    "AdminTrash": AdminTrash,
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
    "index": index,
}

export const pagesConfig = {
    mainPage: "Quizzes",
    Pages: PAGES,
};