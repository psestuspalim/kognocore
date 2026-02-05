
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
//const realClient = createClient({
// appId,
// serverUrl,
// token,
// functionsVersion,
// requiresAuth: false
//});
const realClient = null;

// Mock client implementation
// Mock client implementation with LocalStorage persistence
import { mockCourses, mockFolders, mockSubjects, mockQuizzes, mockQuizSettings, mockUser } from '@/lib/mock-data';

// Helper to initialize storage
const initializeStorage = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('app_courses')) {
    localStorage.setItem('app_courses', JSON.stringify(mockCourses));
  }
  if (!localStorage.getItem('app_folders')) {
    localStorage.setItem('app_folders', JSON.stringify(mockFolders));
  }
  if (!localStorage.getItem('app_subjects')) {
    localStorage.setItem('app_subjects', JSON.stringify(mockSubjects));
  }
  if (!localStorage.getItem('app_quizzes')) {
    localStorage.setItem('app_quizzes', JSON.stringify(mockQuizzes));
  }
  if (!localStorage.getItem('app_quiz_settings')) {
    localStorage.setItem('app_quiz_settings', JSON.stringify([mockQuizSettings]));
  }
  if (!localStorage.getItem('app_users')) {
    localStorage.setItem('app_users', JSON.stringify([mockUser]));
  }
};

// Initialize on load
initializeStorage();

// ... imports

/**
 * @typedef {Object} Base44Entity
 * @property {(orderBy?: string) => Promise<any[]>} list
 * @property {(criteria: Object, orderBy?: string) => Promise<any[]>} filter
 * @property {(id: string) => Promise<any>} get
 * @property {(data: Object) => Promise<any>} create
 * @property {(id: string, data: Object) => Promise<any>} update
 * @property {(id: string) => Promise<{success: boolean}>} delete
 * @property {(queryEntity: any) => any} Query
 */

const getItems = (entityName) => {
  const keyMap = {
    'Course': 'app_courses',
    'Folder': 'app_folders',
    'Subject': 'app_subjects',
    'Quiz': 'app_quizzes',
    'QuizSettings': 'app_quiz_settings',
    'User': 'app_users',
    'QuizAttempt': 'app_quiz_attempts',
    'UserStats': 'app_user_stats',
    'DeletedItem': 'app_deleted_items',
    'QuizSession': 'app_quiz_sessions',
    'ExamDate': 'app_exam_dates',
    'CourseEnrollment': 'app_course_enrollments',
    'CourseAccessCode': 'app_course_access_codes',
    'GameRoom': 'app_game_rooms',
    'Tournament': 'app_tournaments',
    'Audio': 'app_audios',
    'FeatureUsage': 'app_feature_usage',
    'QuizAnswer': 'app_quiz_answers',
    'Question': 'app_questions'
  };

  const key = keyMap[entityName];
  if (!key) return [];

  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

const saveItems = (entityName, items) => {
  const keyMap = {
    'Course': 'app_courses',
    'Folder': 'app_folders',
    'Subject': 'app_subjects',
    'Quiz': 'app_quizzes',
    'QuizSettings': 'app_quiz_settings',
    'User': 'app_users',
    'QuizAttempt': 'app_quiz_attempts',
    'UserStats': 'app_user_stats',
    'DeletedItem': 'app_deleted_items',
    'QuizSession': 'app_quiz_sessions',
    'ExamDate': 'app_exam_dates',
    'CourseEnrollment': 'app_course_enrollments',
    'CourseAccessCode': 'app_course_access_codes',
    'GameRoom': 'app_game_rooms',
    'Tournament': 'app_tournaments',
    'Audio': 'app_audios',
    'FeatureUsage': 'app_feature_usage',
    'QuizAnswer': 'app_quiz_answers',
    'Question': 'app_questions'
  };

  const key = keyMap[entityName];
  if (key) {
    localStorage.setItem(key, JSON.stringify(items));
  }
};

/**
 * @type {{
 *   auth: { me: () => Promise<any>, logout: (redirectUrl?: string) => void, redirectToLogin: (redirectUrl?: string) => void, updateMe: (data: Object) => Promise<any> },
 *   analytics: { track: () => Promise<void>, identify: () => Promise<void> },
 *   appLogs: { logUserInApp: () => Promise<void> },
 *   entities: {
 *     Course: Base44Entity,
 *     Folder: Base44Entity,
 *     Subject: Base44Entity,
 *     Quiz: Base44Entity,
 *     QuizSettings: Base44Entity,
 *     User: Base44Entity,
 *     QuizAttempt: Base44Entity,
 *     UserStats: Base44Entity,
 *     DeletedItem: Base44Entity,
 *     QuizSession: Base44Entity,
 *     ExamDate: Base44Entity,
 *     CourseEnrollment: Base44Entity,
 *     CourseAccessCode: Base44Entity,
 *     GameRoom: Base44Entity,
 *     Tournament: Base44Entity,
 *     Audio: Base44Entity,
 *     FeatureUsage: Base44Entity,
 *     QuizAnswer: Base44Entity,
 *     Question: Base44Entity
 *   },
 *   integrations: any
 * }}
 */
const mockClient = {
  // ... existing mockClient implementation ...

  auth: {
    me: async () => {
      const localToken = localStorage.getItem('app_mock_token');
      if (localToken) {
        return JSON.parse(localToken);
      }
      return { ...mockUser, id: 'mock_guest', first_name: 'Guest', username: 'Guest' };
    },
    logout: (redirectUrl) => {
      localStorage.removeItem('app_mock_token');
      if (redirectUrl) window.location.href = '/login';
    },
    redirectToLogin: (redirectUrl) => {
      window.location.href = '/login';
    },
    updateMe: async (data) => {
      const currentUser = JSON.parse(localStorage.getItem('app_mock_token') || JSON.stringify(mockUser));
      const updatedUser = { ...currentUser, ...data };
      localStorage.setItem('app_mock_token', JSON.stringify(updatedUser)); // Update session

      // Also update in users list if needed
      const users = getItems('User');
      const index = users.findIndex(u => u.id === currentUser.id);
      if (index !== -1) {
        users[index] = { ...users[index], ...data };
        saveItems('User', users);
      }
      return updatedUser;
    }
  },
  analytics: {
    track: async () => { },
    identify: async () => { }
  },
  appLogs: {
    logUserInApp: async () => { }
  },
  entities: /** @type {any} */ (new Proxy({}, {
    get: (target, entityName) => {
      return {

        list: async (orderBy) => {
          let items = getItems(entityName);
          // Simple sort if orderBy is provided (very basic implementation)
          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const field = desc ? orderBy.slice(1) : orderBy;
            items.sort((a, b) => {
              if (a[field] < b[field]) return desc ? 1 : -1;
              if (a[field] > b[field]) return desc ? -1 : 1;
              return 0;
            });
          }
          return items;
        },
        filter: async (criteria, orderBy) => {
          let items = getItems(entityName);
          items = items.filter(item => {
            for (const key in criteria) {
              if (item[key] !== criteria[key]) return false;
            }
            return true;
          });
          if (orderBy) {
            const desc = orderBy.startsWith('-');
            const field = desc ? orderBy.slice(1) : orderBy;
            items.sort((a, b) => {
              if (a[field] < b[field]) return desc ? 1 : -1;
              if (a[field] > b[field]) return desc ? -1 : 1;
              return 0;
            });
          }
          return items;
        },
        get: async (id) => {
          const items = getItems(entityName);
          return items.find(item => item.id === id);
        },
        create: async (data) => {
          const items = getItems(entityName);
          const prefix = typeof entityName === 'string' ? entityName.toLowerCase() : 'item';
          const newItem = {
            id: `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created_date: new Date().toISOString(),
            ...data
          };
          items.push(newItem);
          saveItems(entityName, items);
          return newItem;
        },
        update: async (id, data) => {
          const items = getItems(entityName);
          const index = items.findIndex(item => item.id === id);
          if (index !== -1) {
            items[index] = { ...items[index], ...data, updated_date: new Date().toISOString() };
            saveItems(entityName, items);
            return items[index];
          }
          throw new Error('Item not found');
        },
        delete: async (id) => {
          let items = getItems(entityName);
          const initialLength = items.length;
          items = items.filter(item => item.id !== id);
          if (items.length !== initialLength) {
            saveItems(entityName, items);
            return { success: true };
          }
          throw new Error('Item not found');
        },
        // Support for special Query syntax used in some places if needed, 
        // essentially maps to list/filter/find
        Query: (queryEntity) => ({
          where: () => ({
            orderBy: () => ({
              find: async () => getItems(entityName)
            }),
            find: async () => getItems(entityName)
          }),
          find: async () => getItems(entityName)
        })
      };
    }
  })),
  integrations: {
    Core: {
      InvokeLLM: async () => ({ result: 'Mock LLM Response' }),
      SendEmail: async () => ({ success: true }),
      GenerateImage: async () => ({ url: 'https://via.placeholder.com/150' }),
      UploadFile: async () => ({ url: 'https://via.placeholder.com/150' }),
      ExtractDataFromUploadedFile: async () => ({ data: {} }),
      SendSMS: async () => ({ success: true })
    }
  }
};

export const client = mockClient;
