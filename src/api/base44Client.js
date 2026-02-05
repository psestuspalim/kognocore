import { createClient } from '@base44/sdk';
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

  if (!localStorage.getItem('base44_courses')) {
    localStorage.setItem('base44_courses', JSON.stringify(mockCourses));
  }
  if (!localStorage.getItem('base44_folders')) {
    localStorage.setItem('base44_folders', JSON.stringify(mockFolders));
  }
  if (!localStorage.getItem('base44_subjects')) {
    localStorage.setItem('base44_subjects', JSON.stringify(mockSubjects));
  }
  if (!localStorage.getItem('base44_quizzes')) {
    localStorage.setItem('base44_quizzes', JSON.stringify(mockQuizzes));
  }
  if (!localStorage.getItem('base44_quiz_settings')) {
    localStorage.setItem('base44_quiz_settings', JSON.stringify([mockQuizSettings]));
  }
  if (!localStorage.getItem('base44_users')) {
    localStorage.setItem('base44_users', JSON.stringify([mockUser]));
  }
};

// Initialize on load
initializeStorage();

const getItems = (entityName) => {
  const keyMap = {
    'Course': 'base44_courses',
    'Folder': 'base44_folders',
    'Subject': 'base44_subjects',
    'Quiz': 'base44_quizzes',
    'QuizSettings': 'base44_quiz_settings',
    'User': 'base44_users',
    'QuizAttempt': 'base44_quiz_attempts',
    'UserStats': 'base44_user_stats',
    'DeletedItem': 'base44_deleted_items',
    'QuizSession': 'base44_quiz_sessions'
  };

  const key = keyMap[entityName];
  if (!key) return [];

  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

const saveItems = (entityName, items) => {
  const keyMap = {
    'Course': 'base44_courses',
    'Folder': 'base44_folders',
    'Subject': 'base44_subjects',
    'Quiz': 'base44_quizzes',
    'QuizSettings': 'base44_quiz_settings',
    'User': 'base44_users',
    'QuizAttempt': 'base44_quiz_attempts',
    'UserStats': 'base44_user_stats',
    'DeletedItem': 'base44_deleted_items',
    'QuizSession': 'base44_quiz_sessions'
  };

  const key = keyMap[entityName];
  if (key) {
    localStorage.setItem(key, JSON.stringify(items));
  }
};

const mockClient = {
  auth: {
    me: async () => {
      const localToken = localStorage.getItem('base44_mock_token');
      if (localToken) {
        return JSON.parse(localToken);
      }
      return { ...mockUser, id: 'mock_guest', first_name: 'Guest', username: 'Guest' };
    },
    logout: (redirectUrl) => {
      localStorage.removeItem('base44_mock_token');
      if (redirectUrl) window.location.href = '/login';
    },
    redirectToLogin: (redirectUrl) => {
      window.location.href = '/login';
    },
    updateMe: async (data) => {
      const currentUser = JSON.parse(localStorage.getItem('base44_mock_token') || JSON.stringify(mockUser));
      const updatedUser = { ...currentUser, ...data };
      localStorage.setItem('base44_mock_token', JSON.stringify(updatedUser)); // Update session

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
  entities: new Proxy({}, {
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
  }),
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

export const base44 = mockClient;
