
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
import { mockCourses, mockFolders, mockSubjects, mockQuizzes, mockQuizSettings, mockUser, mockResources } from '@/lib/mock-data';

// Helper to initialize storage
// Courses, subjects, and folders are ALWAYS seeded from mock-data to keep the
// medicine curriculum up to date. Other entities only initialize if absent.
const SEED_VERSION = 'v5_medicina'; // bump this to force a re-seed

const initializeStorage = () => {
  if (typeof window === 'undefined') return;

  // Always overwrite structural data so the curriculum stays in sync
  if (localStorage.getItem('app_seed_version') !== SEED_VERSION) {
    localStorage.setItem('app_courses', JSON.stringify(mockCourses));
    localStorage.setItem('app_subjects', JSON.stringify(mockSubjects));
    localStorage.setItem('app_folders', JSON.stringify(mockFolders));
    localStorage.setItem('app_seed_version', SEED_VERSION);
  }

  if (!localStorage.getItem('app_quizzes')) {
    localStorage.setItem('app_quizzes', JSON.stringify(mockQuizzes));
  }
  if (!localStorage.getItem('app_resources')) {
    localStorage.setItem('app_resources', JSON.stringify(mockResources));
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
 * @typedef {Object} KognocoreEntity
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
    'Question': 'app_questions',
    'Resource': 'app_resources'
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
    'Question': 'app_questions',
    'Resource': 'app_resources'
  };

  const key = keyMap[entityName];
  if (key) {
    localStorage.setItem(key, JSON.stringify(items));
  }
};

const sortByField = (items, orderBy) => {
  if (!orderBy) return items;
  const desc = orderBy.startsWith('-');
  const field = desc ? orderBy.slice(1) : orderBy;
  return [...items].sort((a, b) => {
    if (a[field] < b[field]) return desc ? 1 : -1;
    if (a[field] > b[field]) return desc ? -1 : 1;
    return 0;
  });
};

const mergeById = (primary, secondary) => {
  const map = new Map();
  secondary.forEach((item) => map.set(item.id, item));
  primary.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};

const fetchRemoteQuizzes = async () => {
  const response = await fetch('/api/quizzes');
  if (!response.ok) throw new Error('REMOTE_QUIZ_LIST_FAILED');
  const data = await response.json().catch(() => ({}));
  return Array.isArray(data?.quizzes) ? data.quizzes : [];
};

const fetchRemoteAttempts = async () => {
  const response = await fetch('/api/attempts');
  if (!response.ok) throw new Error('REMOTE_ATTEMPT_LIST_FAILED');
  const data = await response.json().catch(() => ({}));
  return Array.isArray(data?.attempts) ? data.attempts : [];
};

/**
 * @type {{
 *   auth: { me: () => Promise<any>, logout: (redirectUrl?: string) => void, redirectToLogin: (redirectUrl?: string) => void, updateMe: (data: Object) => Promise<any> },
 *   analytics: { track: () => Promise<void>, identify: () => Promise<void> },
 *   appLogs: { logUserInApp: () => Promise<void> },
 *   entities: {
 *     Course: KognocoreEntity,
 *     Folder: KognocoreEntity,
 *     Subject: KognocoreEntity,
 *     Quiz: KognocoreEntity,
 *     QuizSettings: KognocoreEntity,
 *     User: KognocoreEntity,
 *     QuizAttempt: KognocoreEntity,
 *     UserStats: KognocoreEntity,
 *     DeletedItem: KognocoreEntity,
 *     QuizSession: KognocoreEntity,
 *     ExamDate: KognocoreEntity,
 *     CourseEnrollment: KognocoreEntity,
 *     CourseAccessCode: KognocoreEntity,
 *     GameRoom: KognocoreEntity,
 *     Tournament: KognocoreEntity,
 *     Audio: KognocoreEntity,
 *     FeatureUsage: KognocoreEntity,
 *     QuizAnswer: KognocoreEntity,
    Question: KognocoreEntity,
    Resource: KognocoreEntity
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
          if (entityName === 'Quiz') {
            const local = getItems('Quiz');
            try {
              const remote = await fetchRemoteQuizzes();
              const merged = mergeById(remote, local);
              saveItems('Quiz', merged);
              return sortByField(merged, orderBy);
            } catch (_err) {
              return sortByField(local, orderBy);
            }
          }

          if (entityName === 'QuizAttempt') {
            const local = getItems('QuizAttempt');
            try {
              const remote = await fetchRemoteAttempts();
              const merged = mergeById(remote, local);
              saveItems('QuizAttempt', merged);
              return sortByField(merged, orderBy);
            } catch (_err) {
              return sortByField(local, orderBy);
            }
          }

          let items = getItems(entityName);
          // Simple sort if orderBy is provided (very basic implementation)
          return sortByField(items, orderBy);
        },
        filter: async (criteria, orderBy) => {
          if (entityName === 'Quiz') {
            const all = await (async () => {
              try {
                const remote = await fetchRemoteQuizzes();
                const local = getItems('Quiz');
                const merged = mergeById(remote, local);
                saveItems('Quiz', merged);
                return merged;
              } catch (_err) {
                return getItems('Quiz');
              }
            })();

            let filtered = all.filter(item => {
              for (const key in criteria) {
                if (item[key] !== criteria[key]) return false;
              }
              return true;
            });
            return sortByField(filtered, orderBy);
          }

          if (entityName === 'QuizAttempt') {
            const all = await (async () => {
              try {
                const remote = await fetchRemoteAttempts();
                const local = getItems('QuizAttempt');
                const merged = mergeById(remote, local);
                saveItems('QuizAttempt', merged);
                return merged;
              } catch (_err) {
                return getItems('QuizAttempt');
              }
            })();

            const filtered = all.filter(item => {
              for (const key in criteria) {
                if (item[key] !== criteria[key]) return false;
              }
              return true;
            });
            return sortByField(filtered, orderBy);
          }

          let items = getItems(entityName);
          items = items.filter(item => {
            for (const key in criteria) {
              if (item[key] !== criteria[key]) return false;
            }
            return true;
          });
          return sortByField(items, orderBy);
        },
        get: async (id) => {
          if (entityName === 'Quiz') {
            const local = getItems('Quiz');
            const localItem = local.find(item => item.id === id);
            try {
              const remote = await fetchRemoteQuizzes();
              const remoteItem = remote.find(item => item.id === id);
              if (remoteItem) {
                const merged = mergeById(remote, local);
                saveItems('Quiz', merged);
                return remoteItem;
              }
            } catch (_err) {
              // ignore
            }
            return localItem;
          }

          if (entityName === 'QuizAttempt') {
            const local = getItems('QuizAttempt');
            const localItem = local.find(item => item.id === id);
            try {
              const remote = await fetchRemoteAttempts();
              const remoteItem = remote.find(item => item.id === id);
              if (remoteItem) {
                const merged = mergeById(remote, local);
                saveItems('QuizAttempt', merged);
                return remoteItem;
              }
            } catch (_err) {
              // ignore
            }
            return localItem;
          }

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

          if (entityName === 'Quiz') {
            try {
              await fetch('/api/quizzes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quiz: newItem })
              });
            } catch (_err) {
              // keep local create working
            }
          }

          if (entityName === 'QuizAttempt') {
            try {
              await fetch('/api/attempts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attempt: newItem })
              });
            } catch (_err) {
              // keep local create working
            }
          }

          return newItem;
        },
        update: async (id, data) => {
          const items = getItems(entityName);
          const index = items.findIndex(item => item.id === id);
          if (index !== -1) {
            items[index] = { ...items[index], ...data, updated_date: new Date().toISOString() };
            saveItems(entityName, items);

            if (entityName === 'Quiz') {
              try {
                await fetch('/api/quizzes', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id, data })
                });
              } catch (_err) {
                // keep local update working
              }
            }

            if (entityName === 'QuizAttempt') {
              try {
                await fetch('/api/attempts', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id, data })
                });
              } catch (_err) {
                // keep local update working
              }
            }

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

            if (entityName === 'Quiz') {
              try {
                await fetch(`/api/quizzes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
              } catch (_err) {
                // keep local delete working
              }
            }

            if (entityName === 'QuizAttempt') {
              try {
                await fetch(`/api/attempts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
              } catch (_err) {
                // keep local delete working
              }
            }

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
