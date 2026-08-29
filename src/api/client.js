
import { appParams } from '@/lib/app-params';
import { getAuthorizationHeaders, supabase } from '@/lib/supabase';
import { getOrCreateLearnerId, getOrCreateStudentAlias, saveStudentAlias } from '@/lib/learner-id';

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

const authorizedFetch = async (input, init = {}) => {
  const authorizationHeaders = await getAuthorizationHeaders();
  return fetch(input, {
    ...init,
    headers: {
      ...authorizationHeaders,
      ...(init.headers || {})
    }
  });
};

const REMOTE_ENTITIES = {
  Quiz: { endpoint: '/api/quizzes', bodyKey: 'quiz', updateMethod: 'POST' },
  QuizAttempt: { endpoint: '/api/attempts', bodyKey: 'attempt', updateMethod: 'POST', offline: true },
  CourseEnrollment: { endpoint: '/api/enrollments', bodyKey: 'enrollment', updateMethod: 'POST', offline: true },
  CourseAccessCode: { endpoint: '/api/access-codes', bodyKey: 'code', updateMethod: 'PATCH' }
};

const PENDING_DELETES_KEY = 'kc_pending_remote_deletes_v1';

const cleanRemoteItem = (item) => {
  if (!item || typeof item !== 'object') return item;
  const { _sync_status, _sync_operation, _sync_error, ...clean } = item;
  return clean;
};

const requestJson = async (input, init = {}) => {
  const response = await authorizedFetch(input, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || `REMOTE_REQUEST_FAILED_${response.status}`);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }
  return data;
};

const persistRemoteEntity = async (entityName, item, operation = 'create') => {
  const config = REMOTE_ENTITIES[entityName];
  if (!config) return null;

  const cleanItem = cleanRemoteItem(item);
  const isPatch = operation === 'update' && config.updateMethod === 'PATCH';
  return requestJson(config.endpoint, {
    method: isPatch ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(isPatch
      ? { id: cleanItem.id, data: cleanItem }
      : { [config.bodyKey]: cleanItem })
  });
};

const deleteRemoteEntity = (entityName, id) => {
  const config = REMOTE_ENTITIES[entityName];
  if (!config) return Promise.resolve(null);
  return requestJson(`${config.endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
};

// Mock client implementation
// Mock client implementation with LocalStorage persistence
import { mockCourses, mockFolders, mockSubjects, mockQuizzes, mockQuizSettings, mockUser, mockResources } from '@/lib/mock-data';

// Helper to initialize storage
// Courses, subjects, and folders are ALWAYS seeded from mock-data to keep the
// medicine curriculum up to date. Other entities only initialize if absent.
const SEED_VERSION = 'v14_bundle_all_4_megasimulacros'; // bump this to force a re-seed

const initializeStorage = () => {
  if (typeof window === 'undefined') return;

  // Always overwrite structural data so the curriculum stays in sync.
  // Quizzes are NOT overwritten here — they use the merge logic below
  // so user-created quizzes are never lost on a seed version bump.
  if (localStorage.getItem('app_seed_version') !== SEED_VERSION) {
    localStorage.setItem('app_courses', JSON.stringify(mockCourses));
    localStorage.setItem('app_subjects', JSON.stringify(mockSubjects));
    localStorage.setItem('app_folders', JSON.stringify(mockFolders));
    localStorage.setItem('app_seed_version', SEED_VERSION);
    localStorage.setItem('structure_initialized', 'true');
  }

  // Ensure all bundled repository quizzes exist in app_quizzes and user-created quizzes are preserved
  try {
    let stored = JSON.parse(localStorage.getItem('app_quizzes') || '[]');
    if (!Array.isArray(stored)) stored = [];
    
    let modified = false;

    // For every quiz packaged in the repository:
    for (const repoQ of mockQuizzes) {
      if (!repoQ) continue;
      const repoId = String(repoQ.id || '');
      const repoTitle = String(repoQ.title || '').trim().toLowerCase();

      const existingIndex = stored.findIndex(q => q && (String(q.id) === repoId || (repoTitle && String(q.title || '').trim().toLowerCase() === repoTitle)));

      if (existingIndex < 0) {
        // New quiz from repository -> add it!
        stored.push(repoQ);
        modified = true;
      } else {
        // If repo quiz has more questions or was updated, update it while preserving custom fields
        const existingQ = stored[existingIndex];
        const existingCount = existingQ.questions?.length || existingQ.total_questions || 0;
        const repoCount = repoQ.questions?.length || repoQ.total_questions || 0;
        if (repoCount > existingCount) {
          stored[existingIndex] = { ...existingQ, ...repoQ };
          modified = true;
        }
      }
    }

    // Auto-heal subjects and courses for any legacy or misrouted quizzes
    const validIds = ['subj_med_interna', 'subj_cirugia_gen', 'subj_pediatria', 'subj_ginecologia_obs', 'subj_simuladores'];
    stored = stored.map(q => {
      if (!q) return q;
      let subj = q.subject_id;
      if (!subj || subj === 'root' || !validIds.includes(subj)) {
        const txt = `${q.title || ''} ${q.subject || ''} ${q.description || ''} ${JSON.stringify(q.questions || [])}`.toLowerCase();
        if (txt.includes('pediatr') || txt.includes('niño') || txt.includes('neonato') || txt.includes('lactante') || txt.includes('gestación') || txt.includes('reneo')) {
          subj = 'subj_pediatria';
        } else if (txt.includes('cirug') || txt.includes('quirúrg') || txt.includes('apendic') || txt.includes('hernia')) {
          subj = 'subj_cirugia_gen';
        } else if (txt.includes('ginec') || txt.includes('obstet') || txt.includes('embaraz') || txt.includes('parto') || txt.includes('gyo')) {
          subj = 'subj_ginecologia_obs';
        } else if (txt.includes('simulad') || txt.includes('examen')) {
          subj = 'subj_simuladores';
        } else {
          subj = 'subj_med_interna';
        }
        modified = true;
        return { ...q, subject_id: subj, course_id: 'course_enarm2026' };
      }
      return q;
    });

    if (modified || !localStorage.getItem('app_quizzes')) {
      localStorage.setItem('app_quizzes', JSON.stringify(stored));
    }
  } catch (e) {
    console.error('Quiz migration error:', e);
    if (!localStorage.getItem('app_quizzes')) {
      localStorage.setItem('app_quizzes', JSON.stringify(mockQuizzes));
    }
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
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
      if (!REMOTE_ENTITIES[entityName]) throw error;
      console.warn(`No se pudo actualizar la copia local de ${entityName}; la copia remota conserva los datos.`, error);
    }
  }
};

const getPendingDeletes = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(PENDING_DELETES_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (_error) {
    return [];
  }
};

const savePendingDeletes = (items) => {
  localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(items));
};

const queuePendingDelete = (entityName, id) => {
  const pending = getPendingDeletes().filter((item) => !(item.entityName === entityName && item.id === id));
  pending.push({ entityName, id, queued_at: new Date().toISOString() });
  savePendingDeletes(pending);
};

const flushPendingSync = async (entityName) => {
  const config = REMOTE_ENTITIES[entityName];
  if (!config?.offline) return;

  const items = getItems(entityName);
  let itemsChanged = false;
  const nextItems = [];

  for (const item of items) {
    if (item?._sync_status !== 'pending') {
      nextItems.push(item);
      continue;
    }

    try {
      await persistRemoteEntity(entityName, item, item._sync_operation || 'update');
      nextItems.push(cleanRemoteItem(item));
      itemsChanged = true;
    } catch (error) {
      nextItems.push({ ...item, _sync_error: error.message });
      if (item._sync_error !== error.message) itemsChanged = true;
    }
  }

  if (itemsChanged) saveItems(entityName, nextItems);

  const pendingDeletes = getPendingDeletes();
  const remainingDeletes = [];
  for (const pending of pendingDeletes) {
    if (pending.entityName !== entityName) {
      remainingDeletes.push(pending);
      continue;
    }

    try {
      await deleteRemoteEntity(entityName, pending.id);
    } catch (_error) {
      remainingDeletes.push(pending);
    }
  }

  if (remainingDeletes.length !== pendingDeletes.length) savePendingDeletes(remainingDeletes);
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
  (secondary || []).forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  (primary || []).forEach((item) => {
    if (item?.id) {
      const existing = map.get(item.id);
      if (existing) {
        const existingTime = new Date(existing.updated_date || existing.created_date || 0).getTime();
        const primaryTime = new Date(item.updated_date || item.created_date || 0).getTime();
        const existingAnswered = Number(existing.answered_questions || 0);
        const primaryAnswered = Number(item.answered_questions || 0);

        // Keep local item if it has newer timestamp or more answered questions
        if (primaryTime > existingTime || (primaryTime === existingTime && primaryAnswered >= existingAnswered)) {
          map.set(item.id, { ...existing, ...item });
        }
      } else {
        map.set(item.id, item);
      }
    }
  });
  return Array.from(map.values());
};

const fetchRemoteQuizzes = async () => {
  const data = await requestJson('/api/quizzes');
  return Array.isArray(data?.quizzes) ? data.quizzes : [];
};

const buildRemoteQuery = (criteria = {}, fields = []) => {
  const params = new URLSearchParams();
  fields.forEach((field) => {
    if (criteria?.[field] !== undefined && criteria?.[field] !== null && criteria[field] !== '') {
      params.set(field, String(criteria[field]));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

const fetchRemoteAttempts = async (criteria = {}) => {
  await flushPendingSync('QuizAttempt');
  const data = await requestJson(`/api/attempts${buildRemoteQuery(criteria, ['learner_id', 'user_email'])}`);
  return Array.isArray(data?.attempts) ? data.attempts : [];
};

const fetchRemoteEnrollments = async (criteria = {}) => {
  await flushPendingSync('CourseEnrollment');
  const data = await requestJson(`/api/enrollments${buildRemoteQuery(criteria, ['learner_id', 'user_email', 'course_id'])}`);
  return Array.isArray(data?.enrollments) ? data.enrollments : [];
};

const fetchRemoteAccessCodes = async () => {
  const data = await requestJson('/api/access-codes');
  return Array.isArray(data?.codes) ? data.codes : [];
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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, username, role')
          .eq('id', session.user.id)
          .single();
        if (error) throw error;
        return {
          ...profile,
          is_admin: profile.role === 'admin',
          auth_provider: 'supabase'
        };
      }

      const codeToken = localStorage.getItem('kc_token');
      if (codeToken) {
        const response = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${codeToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          const learnerId = getOrCreateLearnerId();
          const alias = getOrCreateStudentAlias();
          return {
            id: `student_${learnerId.slice(0, 8)}`,
            email: `learner+${learnerId}@kognocore.local`,
            full_name: alias,
            username: alias,
            role: 'user',
            is_admin: false,
            courseId: data.courseId,
            learner_id: learnerId,
            auth_provider: 'access_code'
          };
        }
      }

      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    },
    logout: async (redirectUrl) => {
      localStorage.removeItem('app_mock_token');
      localStorage.removeItem('kc_token');
      await supabase.auth.signOut();
      if (redirectUrl) window.location.href = '/login';
    },
    redirectToLogin: (redirectUrl) => {
      window.location.href = '/login';
    },
    updateMe: async (data) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const allowed = {
          full_name: data.full_name,
          username: data.username
        };
        Object.keys(allowed).forEach((key) => allowed[key] === undefined && delete allowed[key]);
        const { data: profile, error } = await supabase
          .from('profiles')
          .update(allowed)
          .eq('id', session.user.id)
          .select('id, email, full_name, username, role')
          .single();
        if (error) throw error;
        return profile;
      }

      if (data.username) saveStudentAlias(data.username);
      return { ...(await mockClient.auth.me()), ...data };
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

          if (entityName === 'CourseEnrollment') {
            const local = getItems('CourseEnrollment');
            try {
              const remote = await fetchRemoteEnrollments();
              const merged = mergeById(remote, local);
              saveItems('CourseEnrollment', merged);
              return sortByField(merged, orderBy);
            } catch (_err) {
              return sortByField(local, orderBy);
            }
          }

          if (entityName === 'CourseAccessCode') {
            const local = getItems('CourseAccessCode');
            try {
              const remote = await fetchRemoteAccessCodes();
              const merged = mergeById(remote, local);
              saveItems('CourseAccessCode', merged);
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
                const remote = await fetchRemoteAttempts(criteria);
                const local = getItems('QuizAttempt');
                const merged = mergeById(remote, local);
                saveItems('QuizAttempt', merged);
                return merged;
              } catch (_err) {
                return getItems('QuizAttempt');
              }
            })();

            const targetEmail = (criteria?.user_email || '').trim().toLowerCase();
            const targetLearner = criteria?.learner_id;

            const filtered = all.filter(item => {
              if (targetEmail || targetLearner) {
                const itemEmail = (item.user_email || '').trim().toLowerCase();
                const itemLearner = item.learner_id;
                const isMatch =
                  (!!targetEmail && !!itemEmail && targetEmail === itemEmail) ||
                  (!!targetLearner && !!itemLearner && String(targetLearner) === String(itemLearner)) ||
                  (!itemEmail && !itemLearner); // include local attempts without identity tag

                if (!isMatch) return false;
              }

              for (const key in criteria) {
                if (key === 'user_email' || key === 'learner_id') continue;
                if (item[key] !== criteria[key]) return false;
              }
              return true;
            });
            return sortByField(filtered, orderBy);
          }

          if (entityName === 'CourseEnrollment') {
            const all = await (async () => {
              try {
                const remote = await fetchRemoteEnrollments(criteria);
                const local = getItems('CourseEnrollment');
                const merged = mergeById(remote, local);
                saveItems('CourseEnrollment', merged);
                return merged;
              } catch (_err) {
                return getItems('CourseEnrollment');
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

          if (entityName === 'CourseAccessCode') {
            const all = await (async () => {
              try {
                const remote = await fetchRemoteAccessCodes();
                const local = getItems('CourseAccessCode');
                const merged = mergeById(remote, local);
                saveItems('CourseAccessCode', merged);
                return merged;
              } catch (_err) {
                return getItems('CourseAccessCode');
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

          const config = REMOTE_ENTITIES[entityName];
          if (config) {
            try {
              await persistRemoteEntity(entityName, newItem, 'create');
            } catch (error) {
              if (!config.offline) throw error;
              const pendingItem = {
                ...newItem,
                _sync_status: 'pending',
                _sync_operation: 'create',
                _sync_error: error.message
              };
              items.push(pendingItem);
              saveItems(entityName, items);
              return pendingItem;
            }
          }

          items.push(newItem);
          saveItems(entityName, items);
          return newItem;
        },
        update: async (id, data) => {
          const items = getItems(entityName);
          const index = items.findIndex(item => item.id === id);
          if (index !== -1) {
            const nextItem = cleanRemoteItem({
              ...items[index],
              ...data,
              id,
              updated_date: new Date().toISOString()
            });
            const config = REMOTE_ENTITIES[entityName];

            if (config) {
              try {
                await persistRemoteEntity(entityName, nextItem, 'update');
              } catch (error) {
                if (!config.offline) throw error;
                items[index] = {
                  ...nextItem,
                  _sync_status: 'pending',
                  _sync_operation: 'update',
                  _sync_error: error.message
                };
                saveItems(entityName, items);
                return items[index];
              }
            }

            items[index] = nextItem;
            saveItems(entityName, items);
            return nextItem;
          }
          throw new Error('Item not found');
        },
        delete: async (id) => {
          let items = getItems(entityName);
          const initialLength = items.length;
          items = items.filter(item => item.id !== id);
          if (items.length !== initialLength) {
            const config = REMOTE_ENTITIES[entityName];
            if (config) {
              try {
                await deleteRemoteEntity(entityName, id);
              } catch (error) {
                if (!config.offline) throw error;
                queuePendingDelete(entityName, id);
              }
            }

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
