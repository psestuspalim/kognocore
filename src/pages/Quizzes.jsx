import { useState, useEffect } from 'react';
import { client } from '@/api/client';
import { getFolderColor } from '@/utils/folderColors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { Plus, ArrowLeft, BookOpen, FolderPlus, Folder, ChevronRight, Upload, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { buildContainers } from '../components/utils/contentTree';
import { moveItemsInBackend } from '../components/utils/moveItems';
import { fromCompactFormat, isCompactFormat } from '../components/utils/quizFormats';
import { DragDropContext } from '@hello-pangea/dnd';
import DraggableItem from '../components/dnd/DraggableItem';
import DroppableArea from '../components/dnd/DroppableArea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import FileUploader from '../components/quiz/FileUploader';

import QuizEditor from '../components/quiz/QuizEditor';
import QuestionView from '../components/quiz/QuestionView';
import ResultsView from '../components/quiz/ResultsView';
import SubjectCard from '../components/quiz/SubjectCard';
import SubjectEditor from '../components/quiz/SubjectEditor';
import UsernamePrompt from '../components/quiz/UsernamePrompt';
import FolderCard from '../components/quiz/FolderCard';
import FolderEditor from '../components/quiz/FolderEditor';
import CourseCard from '../components/course/CourseCard';
import CourseEditor from '../components/course/CourseEditor';
import QuizListItem from '../components/quiz/QuizListItem';
import ResourceCard from '../components/resources/ResourceCard';
import ResourceEditor from '../components/resources/ResourceEditor';
import ResourceViewer from '../components/resources/ResourceViewer';


import AdminMenu from '../components/admin/AdminMenu';
import useQuizSettings from '../components/quiz/useQuizSettings';
import SwipeQuizMode from '../components/quiz/SwipeQuizMode';
import FileExplorer from '../components/explorer/FileExplorer';
import MoveQuizModal from '../components/quiz/MoveQuizModal';
import QuizExporter from '../components/admin/QuizExporter';
import CourseJoinModal from '../components/course/CourseJoinModal';
import ResumeQuizModal from '../components/quiz/ResumeQuizModal';



export default function QuizzesPage() {
  const { user: authUser } = useAuth();
  // Restore navigation state from sessionStorage so quizzes are visible on refresh
  const _initNav = (() => {
    try {
      const raw = sessionStorage.getItem('kc_nav_state');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  })();
  // Don't restore to volatile views (quiz/results/swipe) since progress state would be lost
  const _restoredView = (() => {
    const v = _initNav.view;
    if (!v) return 'home';
    if (['quiz', 'results', 'swipe'].includes(v)) return _initNav.subjectId ? 'list' : 'home';
    return v;
  })();
  const [view, setView] = useState(_restoredView);
  const [selectedCourse, setSelectedCourse] = useState(null); // resolved after queries load
  const [selectedSubject, setSelectedSubject] = useState(null); // resolved after queries load
  const [_navRestored, _setNavRestored] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [deckType, setDeckType] = useState('all');
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState([]);
  const [answerLog, setAnswerLog] = useState([]);
  const [markedQuestions, setMarkedQuestions] = useState(new Set());

  const [resumeModalState, setResumeModalState] = useState({
    open: false,
    quiz: null,
    questionCount: 0,
    selectedDeck: 'all',
    quizAttempts: [],
    savedSession: null,
    activeAttempt: null,
    currentQuestion: 1,
    totalQuestions: 1,
    score: 0
  });

  const LOCAL_STORAGE_SESSION_KEY = 'kc_active_quiz_session';

  const saveActiveQuizSession = (data) => {
    try {
      if (!data?.selectedQuiz) return;
      const payload = {
        userEmail: currentUser?.email || '',
        quizId: data.selectedQuiz.id,
        quizTitle: data.selectedQuiz.title,
        attemptId: data.currentAttemptId,
        sessionId: data.currentSessionId,
        selectedQuiz: data.selectedQuiz,
        currentQuestionIndex: data.currentQuestionIndex,
        score: data.score,
        wrongAnswers: data.wrongAnswers,
        correctAnswers: data.correctAnswers,
        answerLog: data.answerLog,
        markedQuestions: Array.from(data.markedQuestions || []),
        responseTimes: data.responseTimes,
        deckType: data.deckType,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Error saving quiz session to localStorage:', e);
    }
  };

  const clearActiveQuizSession = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    } catch (e) { /* ignore */ }
  };

  const getActiveQuizSession = () => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Restore active quiz session automatically on page reload
  useEffect(() => {
    try {
      const savedSession = getActiveQuizSession();
      if (
        savedSession &&
        savedSession.selectedQuiz &&
        Array.isArray(savedSession.selectedQuiz.questions) &&
        savedSession.selectedQuiz.questions.length > 0
      ) {
        const qIdx = savedSession.currentQuestionIndex || 0;
        if (qIdx < savedSession.selectedQuiz.questions.length) {
          setSelectedQuiz(savedSession.selectedQuiz);
          setCurrentQuestionIndex(qIdx);
          setScore(savedSession.score || 0);
          setWrongAnswers(savedSession.wrongAnswers || []);
          setCorrectAnswers(savedSession.correctAnswers || []);
          setAnswerLog(savedSession.answerLog || []);
          setMarkedQuestions(new Set(savedSession.markedQuestions || []));
          setResponseTimes(savedSession.responseTimes || []);
          setCurrentAttemptId(savedSession.attemptId || null);
          setCurrentSessionId(savedSession.sessionId || null);
          setDeckType(savedSession.deckType || 'all');
          setView('quiz');
          toast.info(`Reanudando examen: Pregunta ${qIdx + 1} de ${savedSession.selectedQuiz.questions.length}`);
        }
      }
    } catch (err) {
      console.error('Error auto-restoring quiz session:', err);
    }
  }, []);

  const handleMarkForReview = (question, isMarked) => {
    let nextSet;
    setMarkedQuestions(prev => {
      nextSet = new Set(prev);
      if (isMarked) {
        nextSet.add(question.id || question.question);
      } else {
        nextSet.delete(question.id || question.question);
      }
      return nextSet;
    });

    if (selectedQuiz) {
      saveActiveQuizSession({
        selectedQuiz,
        currentQuestionIndex,
        score,
        wrongAnswers,
        correctAnswers,
        answerLog,
        markedQuestions: nextSet,
        responseTimes,
        currentAttemptId,
        currentSessionId,
        deckType
      });
    }

    if (isMarked) {
      toast.success("Pregunta marcada para revisar", { duration: 1500 });
    }
  };
  const [showUploader, setShowUploader] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(_initNav.currentFolderId || null);

  const [showBulkUploader, setShowBulkUploader] = useState(false);
  const [activeSubjectTab, setActiveSubjectTab] = useState('quizzes');
  const [swipeMode, setSwipeMode] = useState(false);
  const [responseTimes, setResponseTimes] = useState([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Dialogs
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [explorerMode, setExplorerMode] = useState(false);
  const [movingQuiz, setMovingQuiz] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', description: '', color: '#6366f1' });
  const [selectedQuizzes, setSelectedQuizzes] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showFeatureAnalytics, setShowFeatureAnalytics] = useState(false);
  const [showContentManager, setShowContentManager] = useState(false);
  const [showQuizExporter, setShowQuizExporter] = useState(false);

  // Resource states
  const [showResourceEditor, setShowResourceEditor] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [viewingResource, setViewingResource] = useState(null);
  const [activeTab, setActiveTab] = useState('quizzes'); // 'quizzes' or 'resources'

  const queryClient = useQueryClient();

  const normalizeOptionText = (option) => {
    if (typeof option === 'string') return option.trim();
    if (!option || typeof option !== 'object') return '';
    return String(
      option.text ??
      option.answerText ??
      option.value ??
      option.v ??
      option.t ??
      option.label ??
      ''
    ).trim();
  };

  const normalizeQuestionOptions = (question) => {
    let rawOptions = [];

    if (Array.isArray(question?.answerOptions)) rawOptions = question.answerOptions;
    else if (Array.isArray(question?.options)) rawOptions = question.options;
    else if (question?.options && typeof question.options === 'object') {
      rawOptions = Object.entries(question.options).map(([key, value]) => ({
        label: key,
        text: value
      }));
    }

    const answerOptions = rawOptions
      .map((opt, idx) => {
        const text = normalizeOptionText(opt);
        if (!text) return null;
        return {
          id: String(opt?.id ?? idx),
          text,
          isCorrect: Boolean(opt?.isCorrect ?? opt?.c),
          rationale: opt?.rationale ?? opt?.r ?? '',
          errorType: opt?.errorType ?? opt?.et ?? ''
        };
      })
      .filter(Boolean);

    return {
      ...question,
      answerOptions
    };
  };

  // Quiz settings hook
  const { settings: quizSettings } = useQuizSettings(
    selectedQuiz?.id,
    selectedSubject?.id,
    currentFolderId,
    selectedCourse?.id
  );

  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
      return;
    }

    const loadUser = async () => {
      try {
        const user = await client.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, [authUser]);

  // Queries
  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => client.entities.Course.list('order'),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', currentUser?.email],
    queryFn: () => client.entities.CourseEnrollment.filter({
      user_email: currentUser?.email,
      status: 'approved'
    }),
    enabled: !!currentUser?.email && currentUser?.role !== 'admin'
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => client.entities.Subject.list('order'),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => client.entities.Folder.list('order'),
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => client.entities.Quiz.list('-created_date'),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => client.entities.Resource.list('-created_date'),
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['attempts', currentUser?.learner_id || currentUser?.email],
    queryFn: () => {
      if (currentUser?.learner_id) {
        return client.entities.QuizAttempt.filter({ learner_id: currentUser.learner_id }, '-created_date');
      }
      return client.entities.QuizAttempt.filter({ user_email: currentUser?.email }, '-created_date');
    },
    enabled: !!(currentUser?.learner_id || currentUser?.email),
  });



  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => client.entities.User.list(),
    enabled: currentUser?.role === 'admin',
  });



  // --- Restore navigation objects from sessionStorage IDs (runs once after queries load) ---
  useEffect(() => {
    if (_navRestored) return;
    if (courses.length === 0 && subjects.length === 0) return; // queries not loaded yet

    const nav = _initNav;
    if (!nav.view || nav.view === 'home') return; // nothing to restore

    let didRestore = false;

    if (nav.courseId) {
      const course = courses.find(c => c.id === nav.courseId);
      if (course) {
        setSelectedCourse(course);
        didRestore = true;
      }
    }

    if (nav.subjectId) {
      const subject = subjects.find(s => s.id === nav.subjectId);
      if (subject) {
        setSelectedSubject(subject);
        didRestore = true;
      }
    }

    _setNavRestored(true);
  }, [courses, subjects, _navRestored]);

  // --- Save navigation state whenever it changes ---
  useEffect(() => {
    try {
      const navState = {
        view,
        courseId: selectedCourse?.id || null,
        subjectId: selectedSubject?.id || null,
        currentFolderId: currentFolderId || null
      };
      sessionStorage.setItem('kc_nav_state', JSON.stringify(navState));
    } catch { /* ignore */ }
  }, [view, selectedCourse?.id, selectedSubject?.id, currentFolderId]);

  const isAdmin = currentUser?.role === 'admin';
  const isProfessor = currentUser?.role === 'professor';
  const canEdit = isAdmin || isProfessor;
  const hasKcToken = typeof window !== 'undefined' && !!window.localStorage.getItem('kc_token');
  const isLearnerRole = currentUser?.role === 'student' || currentUser?.role === 'user';
  const isServerCodeSession = isLearnerRole && hasKcToken && !!currentUser?.courseId;
  const isDirectCodeSession = isLearnerRole && currentUser?.loginMode === 'direct-code';
  const hasApprovedEnrollments = enrollments.length > 0;
  const normalizeId = (value) => (value === null || value === undefined ? null : String(value).trim());
  const sameId = (left, right) => {
    const l = normalizeId(left);
    const r = normalizeId(right);
    return !!l && !!r && l === r;
  };
  const userCourseId = normalizeId(currentUser?.courseId);
  const hasCourseIdMatch = !!(userCourseId && courses.some(c => c?.id && sameId(c.id, userCourseId)));
  const fallbackCourseId = hasCourseIdMatch ? currentUser.courseId : null;

  const getFolderHierarchyContext = (folderId) => {
    if (!folderId) return { course_id: null, subject_id: null };

    let cursor = folders.find((f) => sameId(f.id, folderId));
    let safety = 0;
    let courseId = null;
    let subjectId = null;

    while (cursor && safety < 30) {
      if (!courseId && cursor.course_id) courseId = cursor.course_id;
      if (!subjectId && cursor.subject_id) subjectId = cursor.subject_id;
      if (!cursor.parent_id) break;
      cursor = folders.find((f) => sameId(f.id, cursor.parent_id));
      safety += 1;
    }

    if (!courseId && subjectId) {
      const subj = subjects.find((s) => sameId(s.id, subjectId));
      if (subj?.course_id) courseId = subj.course_id;
    }

    return { course_id: courseId || null, subject_id: subjectId || null };
  };

  const buildSubjectPayload = (data) => {
    const payload = { ...data };

    if (currentFolderId) {
      const ctx = getFolderHierarchyContext(currentFolderId);
      payload.folder_id = currentFolderId;
      payload.subject_id = null;
      payload.course_id = ctx.course_id || selectedCourse?.id || payload.course_id || null;
      return payload;
    }

    payload.folder_id = null;
    payload.course_id = selectedCourse?.id || payload.course_id || null;
    payload.subject_id = null;
    return payload;
  };

  const buildFolderPayload = (data) => {
    const payload = { ...data };
    const parentId = payload.parent_id || currentFolderId || null;

    if (parentId) {
      const ctx = getFolderHierarchyContext(parentId);
      payload.parent_id = parentId;
      payload.course_id = ctx.course_id || selectedCourse?.id || payload.course_id || null;
      payload.subject_id = payload.subject_id || ctx.subject_id || selectedSubject?.id || null;
      return payload;
    }

    if (payload.subject_id) {
      const subject = subjects.find((s) => sameId(s.id, payload.subject_id));
      payload.course_id = subject?.course_id || selectedCourse?.id || payload.course_id || null;
      payload.parent_id = null;
      return payload;
    }

    payload.parent_id = null;
    payload.subject_id = null;
    payload.course_id = selectedCourse?.id || payload.course_id || null;
    return payload;
  };

  const buildQuizPayload = (data) => {
    const payload = { ...data };

    if (currentFolderId) {
      const ctx = getFolderHierarchyContext(currentFolderId);
      payload.folder_id = currentFolderId;
      payload.subject_id = payload.subject_id || ctx.subject_id || null;
      return payload;
    }

    if (selectedSubject?.id) {
      payload.subject_id = selectedSubject.id;
      payload.folder_id = null;
      return payload;
    }

    return payload;
  };

  // Mutations
  const createCourseMutation = useMutation({
    mutationFn: (data) => client.entities.Course.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowCourseDialog(false);
      setNewItem({ name: '', description: '', color: '#6366f1' });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Course.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setEditingCourse(null);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id) => client.entities.Course.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  const createSubjectMutation = useMutation({
    mutationFn: (data) => client.entities.Subject.create(buildSubjectPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setShowSubjectDialog(false);
      setNewItem({ name: '', description: '', color: '#6366f1' });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Subject.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setEditingSubject(null);
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id) => client.entities.Subject.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  });

  const createFolderMutation = useMutation({
    mutationFn: (data) => {
      // Asignar color automáticamente basado en el número de carpetas existentes
      const folderCount = folders.length;
      const folderData = {
        ...buildFolderPayload(data),
        color: data.color || getFolderColor(folderCount)
      };
      return client.entities.Folder.create(folderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowFolderDialog(false);
      setNewItem({ name: '', description: '', color: '' });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Folder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setEditingFolder(null);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id) => client.entities.Folder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  });

  const createQuizMutation = useMutation({
    mutationFn: (data) => client.entities.Quiz.create(buildQuizPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      setShowUploader(false);
    },
  });

  const updateQuizMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Quiz.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      setEditingQuiz(null);
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: (id) => client.entities.Quiz.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quizzes'] }),
  });

  const createResourceMutation = useMutation({
    mutationFn: (data) => client.entities.Resource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowResourceEditor(false);
      setEditingResource(null);
    },
  });

  const updateResourceMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.Resource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowResourceEditor(false);
      setEditingResource(null);
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id) => client.entities.Resource.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });

  // Bulk delete handlers
  const handleBulkDeleteCourses = async (ids) => {
    for (const id of ids) {
      await client.entities.Course.delete(id);
    }
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  };

  const handleBulkDeleteFolders = async (ids) => {
    for (const id of ids) {
      await client.entities.Folder.delete(id);
    }
    queryClient.invalidateQueries({ queryKey: ['folders'] });
  };

  const handleBulkDeleteSubjects = async (ids) => {
    for (const id of ids) {
      await client.entities.Subject.delete(id);
    }
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
  };

  const handleUpdateCourse = async (id, data) => {
    await client.entities.Course.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  };

  const handleUpdateFolder = async (id, data) => {
    await client.entities.Folder.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['folders'] });
  };

  const handleUpdateSubject = async (id, data) => {
    await client.entities.Subject.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
  };

  // Drag and drop handler
  const handleDragEnd = async (result) => {
    const { draggableId, destination, source, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const destParts = destination.droppableId.split('-');
    const destType = destParts[0]; // 'course', 'folder', 'root', 'subject'
    const destId = destParts[1] || null;

    if (type === 'COURSE') {
      const course = courses.find(c => c.id === draggableId);
      if (course) {
        await updateCourseMutation.mutateAsync({ id: course.id, data: { order: destination.index } });
      }
    } else if (type === 'FOLDER') {
      const folder = folders.find(f => f.id === draggableId);
      if (folder) {
        const newData = { order: destination.index };
        if (destType === 'course') {
          newData.course_id = destId;
          newData.parent_id = null;
          newData.subject_id = null;
        } else if (destType === 'folder') {
          newData.parent_id = destId;
          newData.course_id = null;
          newData.subject_id = null;
        } else if (destType === 'subject') {
          newData.subject_id = destId;
          newData.course_id = null;
          newData.parent_id = null;
        } else if (destType === 'root') {
          newData.course_id = null;
          newData.parent_id = null;
          newData.subject_id = null;
        }
        await updateFolderMutation.mutateAsync({ id: folder.id, data: newData });
      }
    } else if (type === 'SUBJECT') {
      const subject = subjects.find(s => s.id === draggableId);
      if (subject) {
        const newData = { order: destination.index };
        if (destType === 'course') {
          newData.course_id = destId;
          newData.folder_id = null;
        } else if (destType === 'folder') {
          newData.folder_id = destId;
        } else if (destType === 'root') {
          newData.course_id = null;
          newData.folder_id = null;
        }
        await updateSubjectMutation.mutateAsync({ id: subject.id, data: newData });
      }
    } else if (type === 'QUIZ') {
      const quiz = quizzes.find(q => q.id === draggableId);
      if (quiz) {
        const newData = {};
        if (destType === 'folder') {
          newData.folder_id = destId;
          newData.subject_id = null;
        } else if (destType === 'subject') {
          newData.subject_id = destId;
          newData.folder_id = null;
        }
        await updateQuizMutation.mutateAsync({ id: quiz.id, data: newData });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['courses'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
    queryClient.invalidateQueries({ queryKey: ['quizzes'] });
  };

  const saveAttemptMutation = useMutation({
    mutationFn: (data) => client.entities.QuizAttempt.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attempts'] })
  });

  const updateAttemptMutation = useMutation({
    mutationFn: ({ id, data }) => client.entities.QuizAttempt.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attempts'] })
  });

  const buildAttemptIdentity = () => ({
    user_email: currentUser?.email || '',
    username: currentUser?.username || 'Estudiante',
    learner_id: currentUser?.learner_id || null
  });





  const updateUsernameMutation = useMutation({
    mutationFn: (username) => client.auth.updateMe({ username }),
    onSuccess: (updatedUser) => setCurrentUser(updatedUser),
  });

  // Visibility helpers
  const canUserAccess = (item, parentItem = null) => {
    if (isAdmin) return true;
    if (item.is_hidden) return false;

    // Server code session must be scoped strictly to one course, but without
    // being blocked by per-user visibility lists.
    if (isServerCodeSession && currentUser?.courseId) {
      const inScopedCourse =
        sameId(item.id, userCourseId) ||
        sameId(item.course_id, userCourseId) ||
        sameId(parentItem?.id, userCourseId) ||
        sameId(parentItem?.course_id, userCourseId);

      if (inScopedCourse) {
        return true;
      }
    }

    // Si es un curso y el usuario tiene enrollment aprobado, tiene acceso
    if (
      !parentItem &&
      (
        (isServerCodeSession && sameId(userCourseId, item.id)) ||
        enrollments.some(e => sameId(e.course_id, item.id)) ||
        (userCourseId && sameId(userCourseId, item.id)) ||
        (isDirectCodeSession && !hasApprovedEnrollments && sameId(fallbackCourseId, item.id))
      )
    ) {
      return true;
    }

    if (item.visibility === 'inherit' && parentItem) {
      return canUserAccess(parentItem);
    }

    if (item.visibility === 'specific') {
      return item.allowed_users?.includes(currentUser?.email);
    }

    return true;
  };
  const visibleCourses = isAdmin
    ? courses.filter(c => c && c.id && canUserAccess(c))
    : isServerCodeSession
      ? courses.filter(c => c && c.id && sameId(c.id, userCourseId) && canUserAccess(c))
      : courses.filter(c =>
        c &&
        c.id &&
        canUserAccess(c) &&
        (
          enrollments.some(e => sameId(e.course_id, c.id)) ||
          (userCourseId && sameId(userCourseId, c.id)) ||
          (isDirectCodeSession && !hasApprovedEnrollments && sameId(fallbackCourseId, c.id))
        )
      );


  // Filtered data
  // visibleCourses already defined above for debugging
  const unassignedSubjects = subjects.filter(s => s && s.id && !s.course_id && canUserAccess(s));
  const unassignedFolders = folders.filter(f => f && f.id && !f.course_id && !f.parent_id && canUserAccess(f));
  const currentCourseSubjects = selectedCourse
    ? subjects.filter(s => s && s.id && sameId(s.course_id, selectedCourse.id) && canUserAccess(s, selectedCourse))
    : [];
  const currentCourseFolders = selectedCourse
    ? folders.filter(f =>
      f &&
      f.id &&
      sameId(f.course_id, selectedCourse.id) &&
      (currentFolderId ? sameId(f.parent_id, currentFolderId) : !f.parent_id) &&
      canUserAccess(f, selectedCourse)
    )
    : currentFolderId
      ? folders.filter(f => f && f.id && sameId(f.parent_id, currentFolderId) && canUserAccess(f))
      : [];

  const currentFolderQuizzes = currentFolderId
    ? quizzes.filter(q => q && q.id && sameId(q.folder_id, currentFolderId) && (isAdmin || !q.is_hidden))
    : [];
  const currentFolderSubjects = currentFolderId
    ? subjects.filter(s => s && s.id && sameId(s.folder_id, currentFolderId) && canUserAccess(s))
    : currentCourseSubjects.filter(s => s && s.id && !s.folder_id);

  const matchesSubject = (q, subject) => {
    if (!q || !subject) return false;
    const targetId = normalizeId(subject.id);
    const targetName = (subject.name || '').trim().toLowerCase();
    const targetCode = (subject.code || '').trim().toLowerCase();

    const qSubjId = normalizeId(q.subject_id);
    const qSubj = (q.subject || q.subject_name || '').trim().toLowerCase();
    const qSubjIdStr = (q.subject_id ? String(q.subject_id) : '').trim().toLowerCase();

    // 1. Direct ID, code, or name match
    if (
      sameId(qSubjId, targetId) ||
      qSubjIdStr === targetName ||
      qSubjIdStr === targetCode ||
      qSubj === targetName ||
      qSubj === targetCode
    ) {
      return true;
    }

    // 2. Partial name match
    if (targetName && (qSubj.includes(targetName) || qSubjIdStr.includes(targetName))) {
      return true;
    }

    // 3. Keyword heuristic match (e.g. Pediatria, Cirugia, etc.)
    const fullText = `${q.title || ''} ${q.description || ''} ${q.subject || ''}`.toLowerCase();
    if (targetId === 'subj_pediatria' || targetName.includes('pediatr')) {
      if (fullText.includes('pediatr') || fullText.includes('niño') || fullText.includes('neonato') || fullText.includes('reneo') || fullText.includes('gestación')) {
        return true;
      }
    } else if (targetId === 'subj_cirugia_gen' || targetName.includes('cirug')) {
      if (fullText.includes('cirug') || fullText.includes('quirúrg') || fullText.includes('apendic')) {
        return true;
      }
    } else if (targetId === 'subj_ginecologia_obs' || targetName.includes('ginec')) {
      if (fullText.includes('ginec') || fullText.includes('obstet') || fullText.includes('embaraz') || fullText.includes('parto')) {
        return true;
      }
    }

    // 4. If there's only a single subject or fallback for legacy quizzes
    if ((!q.subject_id || q.subject_id === 'root') && targetId === 'subj_pediatria') {
      return true;
    }

    return false;
  };

  const subjectQuizzes = selectedSubject
    ? quizzes.filter(q => q && q.id && matchesSubject(q, selectedSubject) && (isAdmin || !q.is_hidden))
    : [];

  const currentLevelQuizzes = currentFolderId ? currentFolderQuizzes : subjectQuizzes;

  const currentLevelResources = selectedSubject
    ? resources.filter(r => sameId(r.subject_id, selectedSubject.id) && (isAdmin || !r.is_hidden))
    : currentFolderId
      ? resources.filter(r => sameId(r.folder_id, currentFolderId) && (isAdmin || !r.is_hidden))
      : [];

  const [currentAttemptId, setCurrentAttemptId] = useState(null);

  const currentFolder = currentFolderId ? folders.find(f => sameId(f.id, currentFolderId)) : null;
  const currentSubject = selectedSubject || (currentFolder?.subject_id ? subjects.find(s => sameId(s.id, currentFolder.subject_id)) : null);
  const currentCourse =
    selectedCourse ||
    (currentSubject?.course_id ? courses.find(c => sameId(c.id, currentSubject.course_id)) : null) ||
    (currentFolder?.course_id ? courses.find(c => sameId(c.id, currentFolder.course_id)) : null);


  const TopBar = () => (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 mb-6">
      <div className="container mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleHome} className="font-bold text-lg tracking-tight text-slate-900 hover:text-primary transition-colors shrink-0">
            Kognocore
          </button>
          {(selectedCourse || selectedSubject || currentFolderId) && (
            <span className="text-slate-300 shrink-0">/</span>
          )}
          {selectedCourse && (
            <button
              onClick={() => { setSelectedSubject(null); setCurrentFolderId(null); setView('subjects'); }}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
            >
              {selectedCourse.name}
            </button>
          )}
          {selectedSubject && !currentFolderId && (
            <>
              <span className="text-slate-300 shrink-0">/</span>
              <span className="text-sm font-medium text-slate-700 truncate max-w-[120px] sm:max-w-[200px]">{selectedSubject.name}</span>
            </>
          )}
          {currentFolderId && (
            <>
              <span className="text-slate-300 shrink-0">/</span>
              <span className="text-sm font-medium text-slate-700 truncate max-w-[120px] sm:max-w-[200px]">{folders.find(f => sameId(f.id, currentFolderId))?.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentUser?.username && (
            <span className="text-sm text-slate-500 hidden sm:block">{currentUser.username}</span>
          )}
          {isAdmin && <AdminMenu compact />}
        </div>
      </div>
    </header>
  );

  // Quiz handlers
  const handleStartQuiz = async (quiz, questionCount, selectedDeck = 'all', quizAttempts = [], forceRestart = false) => {
    // Check if there is an active session or incomplete attempt for this quiz
    if (!forceRestart) {
      const savedSession = getActiveQuizSession();
      const hasSavedSessionForQuiz = savedSession && sameId(savedSession.quizId, quiz.id);
      const activeAttempt = quizAttempts.find(a => sameId(a.quiz_id, quiz.id) && !a.is_completed && (Number(a.answered_questions || 0) > 0 || (a.answer_log && a.answer_log.length > 0)));

      if (hasSavedSessionForQuiz || activeAttempt) {
        const attemptAnswered = activeAttempt ? Math.max(Number(activeAttempt.answered_questions || 0), activeAttempt.answer_log?.length || 0) : 0;
        const savedIndex = hasSavedSessionForQuiz ? (savedSession.currentQuestionIndex || 0) : attemptAnswered;
        const savedScore = hasSavedSessionForQuiz ? (savedSession.score || 0) : Number(activeAttempt?.score || 0);
        const totalQs = quiz.total_questions || quiz.questions?.length || (savedSession?.selectedQuiz?.questions?.length || 1);

        setResumeModalState({
          open: true,
          quiz,
          questionCount,
          selectedDeck,
          quizAttempts,
          savedSession: hasSavedSessionForQuiz ? savedSession : null,
          activeAttempt: activeAttempt || null,
          currentQuestion: Math.min(savedIndex + 1, totalQs),
          totalQuestions: totalQs,
          score: savedScore
        });
        return;
      }
    }

    // Expandir desde formato compacto solo si existe q Y tiene contenido
    let expandedQuiz;
    if (quiz.q && Array.isArray(quiz.q) && quiz.q.length > 0) {
      const parsedQ = quiz.q.map(q => typeof q === 'string' ? JSON.parse(q) : q);

      if (quiz.t && !quiz.m) {
        expandedQuiz = fromCompactFormat({ t: quiz.t, q: parsedQ });
      } else {
        expandedQuiz = fromCompactFormat({ m: quiz.m || { t: quiz.title, s: quiz.description, v: 'cQ-v2', c: parsedQ.length }, q: parsedQ });
      }
    } else if (quiz.questions && quiz.questions.length > 0) {
      expandedQuiz = quiz;
    } else {
      alert('Este quiz no tiene preguntas');
      return;
    }

    if (!expandedQuiz.questions || expandedQuiz.questions.length === 0) {
      alert('Este quiz no tiene preguntas');
      return;
    }

    let filteredQuestions = [...expandedQuiz.questions];

    if (selectedDeck === 'wrong') {
      const wrongQuestionsMap = new Map();
      quizAttempts.forEach(attempt => {
        attempt.wrong_questions?.forEach(wq => wrongQuestionsMap.set(wq.question, wq));
      });
      filteredQuestions = Array.from(wrongQuestionsMap.values());
    }

    const orderedQuestions = [...filteredQuestions]
      .map(normalizeQuestionOptions)
      .slice(0, Math.min(questionCount, filteredQuestions.length));

    const attempt = await saveAttemptMutation.mutateAsync({
      quiz_id: quiz.id,
      subject_id: quiz.subject_id || expandedQuiz.subject_id,
      ...buildAttemptIdentity(),
      score: 0,
      total_questions: orderedQuestions.length,
      answered_questions: 0,
      is_completed: false,
      wrong_questions: [],
      answer_log: []
    });

    let newSessionId = null;
    try {
      const session = await client.entities.QuizSession.create({
        user_email: currentUser?.email || '',
        username: currentUser?.username || 'Estudiante',
        quiz_id: quiz.id,
        quiz_title: expandedQuiz.title,
        subject_id: quiz.subject_id || expandedQuiz.subject_id,
        current_question: 0,
        total_questions: orderedQuestions.length,
        score: 0,
        wrong_count: 0,
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true
      });
      newSessionId = session.id;
      setCurrentSessionId(session.id);
    } catch (error) {
      console.error('❌ Error creando sesión:', error);
    }

    const newQuizState = {
      ...expandedQuiz,
      questions: orderedQuestions
    };

    setCurrentAttemptId(attempt.id);
    setSelectedQuiz(newQuizState);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setAnswerLog([]);
    setMarkedQuestions(new Set());
    setResponseTimes([]);
    setQuestionStartTime(Date.now());
    setDeckType(selectedDeck);
    setView('quiz');

    saveActiveQuizSession({
      selectedQuiz: newQuizState,
      currentQuestionIndex: 0,
      score: 0,
      wrongAnswers: [],
      correctAnswers: [],
      answerLog: [],
      markedQuestions: new Set(),
      responseTimes: [],
      currentAttemptId: attempt.id,
      currentSessionId: newSessionId,
      deckType: selectedDeck
    });
  };

  const handleResumeFromModal = () => {
    const { savedSession, activeAttempt, quiz } = resumeModalState;
    setResumeModalState(prev => ({ ...prev, open: false }));

    if (savedSession && savedSession.selectedQuiz) {
      setSelectedQuiz(savedSession.selectedQuiz);
      setCurrentQuestionIndex(savedSession.currentQuestionIndex || 0);
      setScore(savedSession.score || 0);
      setWrongAnswers(savedSession.wrongAnswers || []);
      setCorrectAnswers(savedSession.correctAnswers || []);
      setAnswerLog(savedSession.answerLog || []);
      setMarkedQuestions(new Set(savedSession.markedQuestions || []));
      setResponseTimes(savedSession.responseTimes || []);
      setCurrentAttemptId(savedSession.attemptId || null);
      setCurrentSessionId(savedSession.sessionId || null);
      setDeckType(savedSession.deckType || 'all');
      setView('quiz');
      toast.success(`Reanudado en pregunta ${(savedSession.currentQuestionIndex || 0) + 1}`);
      return;
    }

    if (activeAttempt) {
      const answeredCount = Math.max(Number(activeAttempt.answered_questions || 0), activeAttempt.answer_log?.length || 0);
      let expandedQuiz = quiz;
      if (quiz.q && Array.isArray(quiz.q) && quiz.q.length > 0) {
        const parsedQ = quiz.q.map(q => typeof q === 'string' ? JSON.parse(q) : q);
        expandedQuiz = fromCompactFormat({ m: quiz.m || { t: quiz.title, s: quiz.description, v: 'cQ-v2', c: parsedQ.length }, q: parsedQ });
      }
      const orderedQuestions = (expandedQuiz.questions || []).map(normalizeQuestionOptions);
      const wrongAns = activeAttempt.wrong_questions || [];
      const logAns = activeAttempt.answer_log || [];

      const resumedState = {
        ...expandedQuiz,
        questions: orderedQuestions
      };

      const qIndex = Math.min(answeredCount, Math.max(0, orderedQuestions.length - 1));

      setCurrentAttemptId(activeAttempt.id);
      setSelectedQuiz(resumedState);
      setCurrentQuestionIndex(qIndex);
      setScore(Number(activeAttempt.score || 0));
      setWrongAnswers(wrongAns);
      setAnswerLog(logAns);
      setCorrectAnswers(logAns.filter(a => a.is_correct));
      setMarkedQuestions(new Set());
      setView('quiz');

      saveActiveQuizSession({
        selectedQuiz: resumedState,
        currentQuestionIndex: qIndex,
        score: Number(activeAttempt.score || 0),
        wrongAnswers: wrongAns,
        correctAnswers: logAns.filter(a => a.is_correct),
        answerLog: logAns,
        markedQuestions: new Set(),
        responseTimes: [],
        currentAttemptId: activeAttempt.id,
        currentSessionId: null,
        deckType: 'all'
      });

      toast.success(`Reanudado en pregunta ${qIndex + 1}`);
      return;
    }
  };

  const handleRestartFromModal = () => {
    const { quiz, questionCount, selectedDeck, quizAttempts } = resumeModalState;
    setResumeModalState(prev => ({ ...prev, open: false }));
    clearActiveQuizSession();
    handleStartQuiz(quiz, questionCount, selectedDeck, quizAttempts, true);
  };

  const handleAnswer = async (isCorrect, selectedOption, question) => {
    const responseTime = Math.round((Date.now() - questionStartTime) / 1000);
    const newResponseTimes = [...responseTimes, responseTime];
    setResponseTimes(newResponseTimes);

    const newScore = isCorrect ? score + 1 : score;
    const options = question.answerOptions || question.options || [];
    const correctOption = options.find(opt => opt.isCorrect || opt.c);
    const feedbackText =
      question.justificacion ||
      question.justificación ||
      question.feedback ||
      question.explanation ||
      question.rationale ||
      selectedOption?.rationale ||
      correctOption?.rationale ||
      "";

    const newWrongAnswers = !isCorrect ? [...wrongAnswers, {
      question: question.question,
      selected_answer: selectedOption.text,
      correct_answer: correctOption?.text,
      response_time: responseTime,
      answerOptions: options,
      hint: question.hint,
      difficulty: question.difficulty,
      explanation: feedbackText,
      justificacion: feedbackText,
      feedback: feedbackText,
      rationale: feedbackText
    }] : wrongAnswers;
    const answerEntry = {
      question: question.question,
      selected_answer: selectedOption.text,
      correct_answer: correctOption?.text,
      is_correct: isCorrect,
      response_time: responseTime,
      answerOptions: options,
      hint: question.hint,
      difficulty: question.difficulty,
      explanation: feedbackText,
      justificacion: feedbackText,
      feedback: feedbackText,
      rationale: feedbackText
    };
    const newAnswerLog = [...answerLog, answerEntry];

    if (isCorrect) {
      setScore(newScore);
      setCorrectAnswers([...correctAnswers, {
        question: question.question,
        difficulty: question.difficulty,
        selected_answer: selectedOption.text,
        explanation: feedbackText,
        justificacion: feedbackText,
        feedback: feedbackText,
        rationale: feedbackText
      }]);
    } else {
      setWrongAnswers(newWrongAnswers);
    }
    setAnswerLog(newAnswerLog);

    const isLastQuestion = currentQuestionIndex >= selectedQuiz.questions.length - 1;
    const answeredCount = currentQuestionIndex + 1;

    await updateAttemptMutation.mutateAsync({
      id: currentAttemptId,
      data: {
        score: newScore,
        answered_questions: answeredCount,
        wrong_questions: newWrongAnswers,
        answer_log: newAnswerLog,
        response_times: newResponseTimes,
        is_completed: isLastQuestion,
        completed_at: isLastQuestion ? new Date().toISOString() : undefined
      }
    });

    if (!isLastQuestion) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setQuestionStartTime(Date.now());

      saveActiveQuizSession({
        selectedQuiz,
        currentQuestionIndex: nextIndex,
        score: newScore,
        wrongAnswers: newWrongAnswers,
        correctAnswers: isCorrect ? [...correctAnswers, answerEntry] : correctAnswers,
        answerLog: newAnswerLog,
        markedQuestions,
        responseTimes: newResponseTimes,
        currentAttemptId,
        currentSessionId,
        deckType
      });
    } else {
      clearActiveQuizSession();
      // Marcar sesión como completa
      if (currentSessionId) {
        try {
          await client.entities.QuizSession.update(currentSessionId, { is_active: false });
        } catch (error) {
          console.error('Error marking session complete:', error);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['attempts'] });
      setView('results');
    }
  };

  const handleRetry = async () => {
    const shuffledQuiz = {
      ...selectedQuiz,
      questions: selectedQuiz.questions.map(q => ({
        ...normalizeQuestionOptions(q),
        answerOptions: [...normalizeQuestionOptions(q).answerOptions].sort(() => Math.random() - 0.5)
      }))
    };

    const attempt = await saveAttemptMutation.mutateAsync({
      quiz_id: selectedQuiz.id,
      subject_id: selectedQuiz.subject_id,
      ...buildAttemptIdentity(),
      score: 0,
      total_questions: selectedQuiz.questions.length,
      answered_questions: 0,
      is_completed: false,
      wrong_questions: [],
      answer_log: []
    });

    setCurrentAttemptId(attempt.id);
    setSelectedQuiz(shuffledQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setAnswerLog([]);
    setView('quiz');
  };

  const handleRetryWrongQuestions = async () => {
    if (wrongAnswers.length === 0) return;

    const wrongQuestionsQuiz = {
      ...selectedQuiz,
      title: `Repaso: ${selectedQuiz.title}`,
      questions: wrongAnswers.map(wa => ({
        question: wa.question,
        answerOptions: [...(wa.answerOptions || [])].map((opt) => ({
          ...opt,
          text: normalizeOptionText(opt)
        })).filter((opt) => !!opt.text).sort(() => Math.random() - 0.5),
        hint: wa.hint
      }))
    };

    const attempt = await saveAttemptMutation.mutateAsync({
      quiz_id: selectedQuiz.id,
      subject_id: selectedQuiz.subject_id,
      ...buildAttemptIdentity(),
      score: 0,
      total_questions: wrongQuestionsQuiz.questions.length,
      answered_questions: 0,
      is_completed: false,
      wrong_questions: [],
      answer_log: []
    });

    setCurrentAttemptId(attempt.id);
    setSelectedQuiz(wrongQuestionsQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setAnswerLog([]);
    setView('quiz');
  };

  const handleExitQuiz = async () => {
    if (currentAttemptId) {
      await updateAttemptMutation.mutateAsync({
        id: currentAttemptId,
        data: { is_completed: false }
      });
      queryClient.invalidateQueries({ queryKey: ['attempts'] });
    }
    // Marcar sesión como inactiva
    if (currentSessionId) {
      try {
        await client.entities.QuizSession.update(currentSessionId, { is_active: false });
      } catch (error) {
        console.error('Error marking session inactive:', error);
      }
    }
    setSelectedQuiz(null);
    setSwipeMode(false);
    setCurrentSessionId(null);
    // Volver a la vista anterior (carpeta o materia)
    if (currentFolderId) {
      setView('subjects');
    } else {
      setView('list');
    }
  };

  const handleStartSwipeMode = (quiz) => {
    const expandedQuiz = isCompactFormat(quiz) ? fromCompactFormat(quiz) : quiz;

    if (!expandedQuiz.questions || expandedQuiz.questions.length === 0) {
      alert('Este quiz no tiene preguntas');
      return;
    }
    setSelectedQuiz({ ...quiz, questions: expandedQuiz.questions });
    setSwipeMode(true);
    setView('quiz');
  };

  const handleSwipeComplete = async (score, total, wrongAnswers) => {
    await saveAttemptMutation.mutateAsync({
      quiz_id: selectedQuiz.id,
      subject_id: selectedQuiz.subject_id,
      ...buildAttemptIdentity(),
      score: score,
      total_questions: total,
      answered_questions: total,
      is_completed: true,
      wrong_questions: wrongAnswers.map(w => ({
        question: w.statement,
        selected_answer: w.userAnswer,
        correct_answer: w.correctAnswer
      })),
      answer_log: wrongAnswers.map(w => ({
        question: w.statement,
        selected_answer: w.userAnswer,
        correct_answer: w.correctAnswer,
        is_correct: false
      })),
      completed_at: new Date().toISOString()
    });
    queryClient.invalidateQueries({ queryKey: ['attempts'] });
    setSwipeMode(false);
    setSelectedQuiz(null);
    setView('list');
  };

  const handleHome = () => {
    setSelectedQuiz(null);
    setSelectedSubject(null);
    setSelectedCourse(null);
    setCurrentFolderId(null);
    setView('home');
    setShowUploader(false);
  };

  const handleReviewWrongBySubject = async (subjectId) => {
    // Obtener todos los quizzes de la materia
    const subjectQuizIds = quizzes.filter(q => sameId(q.subject_id, subjectId)).map(q => q.id);

    // Obtener todas las preguntas incorrectas de esa materia
    const wrongQuestionsMap = new Map();
    attempts
      .filter(a => subjectQuizIds.includes(a.quiz_id))
      .forEach(attempt => {
        attempt.wrong_questions?.forEach(wq => {
          if (!wrongQuestionsMap.has(wq.question)) {
            wrongQuestionsMap.set(wq.question, {
              question: wq.question,
              answerOptions: wq.answerOptions || [],
              hint: wq.hint
            });
          }
        });
      });

    const wrongQuestions = Array.from(wrongQuestionsMap.values());

    if (wrongQuestions.length === 0) {
      alert('No hay preguntas incorrectas para repasar');
      return;
    }

    // Crear quiz temporal con preguntas incorrectas
    const reviewQuiz = {
      id: `review-${subjectId}`,
      title: `Repaso: ${subjects.find(s => s.id === subjectId)?.name || 'Materia'}`,
      subject_id: subjectId,
      questions: wrongQuestions.map(q => ({
        ...normalizeQuestionOptions(q),
        answerOptions: [...normalizeQuestionOptions(q).answerOptions].sort(() => Math.random() - 0.5)
      }))
    };

    const attempt = await saveAttemptMutation.mutateAsync({
      quiz_id: reviewQuiz.id,
      subject_id: subjectId,
      ...buildAttemptIdentity(),
      score: 0,
      total_questions: reviewQuiz.questions.length,
      answered_questions: 0,
      is_completed: false,
      wrong_questions: [],
      answer_log: []
    });

    setCurrentAttemptId(attempt.id);
    setSelectedQuiz(reviewQuiz);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setCorrectAnswers([]);
    setAnswerLog([]);
    setMarkedQuestions(new Set());
    setResponseTimes([]);
    setQuestionStartTime(Date.now());
    setView('quiz');
  };

  const getSubjectStats = (subjectId) => {
    const subj = subjects.find(s => sameId(s.id, subjectId)) || { id: subjectId };
    const subjectQuizzes = quizzes.filter(q => sameId(q.subject_id, subjectId) || matchesSubject(q, subj));
    const subjectQuizIds = new Set(subjectQuizzes.map(q => q.id));

    const subjectAttempts = attempts.filter(a =>
      sameId(a.subject_id, subjectId) || (a.quiz_id && subjectQuizIds.has(a.quiz_id))
    );

    if (subjectAttempts.length === 0) return { totalCorrect: 0, totalWrong: 0, totalAnswered: 0 };

    // Group attempts by quiz_id to use the best performance attempt per quiz
    const attemptsByQuiz = new Map();
    subjectAttempts.forEach(a => {
      const key = a.quiz_id || a.id;
      if (!attemptsByQuiz.has(key)) attemptsByQuiz.set(key, []);
      attemptsByQuiz.get(key).push(a);
    });

    let totalCorrect = 0;
    let totalWrong = 0;

    attemptsByQuiz.forEach(quizAttempts => {
      let best = quizAttempts[0];
      let bestRatio = -1;

      quizAttempts.forEach(a => {
        const correct = Number(a.score || 0);
        const answered = Math.max(
          Number(a.answered_questions || 0),
          correct + (Array.isArray(a.wrong_questions) ? a.wrong_questions.length : 0)
        );
        const ratio = answered > 0 ? correct / answered : 0;
        if (ratio > bestRatio || (ratio === bestRatio && answered > (Number(best.answered_questions) || 0))) {
          bestRatio = ratio;
          best = a;
        }
      });

      const correct = Number(best.score || 0);
      const answered = Math.max(
        Number(best.answered_questions || 0),
        correct + (Array.isArray(best.wrong_questions) ? best.wrong_questions.length : 0)
      );
      const wrong = Math.max(0, answered - correct);

      totalCorrect += correct;
      totalWrong += wrong;
    });

    const totalAnswered = totalCorrect + totalWrong;
    return { totalCorrect, totalWrong, totalAnswered };
  };

  const getRecursiveQuizCount = (subjectId) => {
    const subj = subjects.find(s => sameId(s.id, subjectId)) || { id: subjectId };
    // 1. Direct quizzes
    const directCount = quizzes.filter(q => matchesSubject(q, subj)).length;

    // 2. Quizzes in folders belonging to this subject
    const subjectFolders = folders.filter(f => sameId(f.subject_id, subjectId));
    const folderIds = subjectFolders.map(f => f.id);
    const folderCount = quizzes.filter(q => folderIds.some(fid => sameId(q.folder_id, fid))).length;

    return directCount + folderCount;
  };

  // Username prompt
  if (!currentUser || !currentUser.username) {
    return <UsernamePrompt onSubmit={(username) => updateUsernameMutation.mutateAsync(username)} />;
  }

  // Back button for navigation
  const BackNav = () => {
    const getBackAction = () => {
      if (view === 'list' && currentFolderId) {
        const parentFolder = folders.find(f => sameId(f.id, currentFolderId));
        if (parentFolder?.parent_id) return { label: folders.find(f => sameId(f.id, parentFolder.parent_id))?.name || 'Atrás', action: () => setCurrentFolderId(parentFolder.parent_id) };
        return { label: selectedCourse?.name || 'Atrás', action: () => { setCurrentFolderId(null); setView('subjects'); } };
      }
      if (view === 'list') return { label: selectedCourse?.name || 'Cursos', action: () => { setSelectedSubject(null); setView('subjects'); } };
      if (view === 'subjects' && currentFolderId) {
        const parentFolder = folders.find(f => sameId(f.id, currentFolderId));
        if (parentFolder?.parent_id) return { label: folders.find(f => sameId(f.id, parentFolder.parent_id))?.name || 'Atrás', action: () => setCurrentFolderId(parentFolder.parent_id) };
        return { label: selectedCourse?.name || 'Cursos', action: () => { setCurrentFolderId(null); } };
      }
      if (view === 'subjects') return { label: 'Cursos', action: handleHome };
      return null;
    };
    const back = getBackAction();
    if (!back) return null;
    return (
      <button onClick={back.action} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4 group">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span>{back.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen">
      {view !== 'quiz' && <TopBar />}

      <div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={view === 'quiz' ? "h-screen overflow-hidden" : "min-h-screen"}>
            <div className={view === 'quiz' ? "" : "container mx-auto px-3 sm:px-4 pb-8"}>
              <AnimatePresence mode="wait">
                {/* Course Editor */}
                {editingCourse && (
                  <motion.div key="course-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button onClick={() => setEditingCourse(null)} variant="ghost" className="mb-6">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                    </Button>
                    <CourseEditor
                      course={editingCourse}
                      users={allUsers}
                      onSave={(data) => updateCourseMutation.mutate({ id: editingCourse.id, data })}
                      onCancel={() => setEditingCourse(null)}
                    />
                  </motion.div>
                )}

                {/* Subject Editor */}
                {editingSubject && !editingCourse && (
                  <motion.div key="subject-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button onClick={() => setEditingSubject(null)} variant="ghost" className="mb-6">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                    </Button>
                    <SubjectEditor
                      subject={editingSubject}
                      users={allUsers}
                      onSave={(data) => updateSubjectMutation.mutate({ id: editingSubject.id, data })}
                      onCancel={() => setEditingSubject(null)}
                    />
                  </motion.div>
                )}

                {/* Folder Editor */}
                {editingFolder && !editingSubject && !editingCourse && (
                  <motion.div key="folder-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button onClick={() => setEditingFolder(null)} variant="ghost" className="mb-6">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                    </Button>
                    <FolderEditor
                      folder={editingFolder}
                      users={allUsers}
                      onSave={(data) => updateFolderMutation.mutate({ id: editingFolder.id, data })}
                      onCancel={() => setEditingFolder(null)}
                    />
                  </motion.div>
                )}

                {/* Quiz Editor */}
                {editingQuiz && !editingFolder && !editingSubject && !editingCourse && (
                  <motion.div key="quiz-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button onClick={() => setEditingQuiz(null)} variant="ghost" className="mb-6">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                    </Button>
                    <QuizEditor
                      quiz={editingQuiz}
                      subjects={subjects}
                      onSave={(data) => updateQuizMutation.mutate({ id: editingQuiz.id, data })}
                      onCancel={() => setEditingQuiz(null)}
                    />
                  </motion.div>
                )}

                {/* Home View - Courses + Unassigned Subjects */}
                {view === 'home' && !editingCourse && !editingSubject && !editingFolder && !editingQuiz && !explorerMode && (
                  <motion.div key="courses" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>


                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mis Cursos</h1>
                        <p className="text-sm text-slate-500 mt-1">Selecciona un curso para comenzar</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!canEdit && (
                          <Button
                            onClick={() => setShowJoinModal(true)}
                            variant="outline"
                            className="text-xs sm:text-sm h-9"
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Ingresar código
                          </Button>
                        )}

                        {canEdit && (
                          <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
                            <DialogTrigger asChild>
                              <Button className="bg-primary hover:bg-primary/90 text-xs sm:text-sm h-9">
                                <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Nuevo curso</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Crear nuevo curso</DialogTitle></DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div>
                                  <Label>Nombre</Label>
                                  <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ej: Semestre Selectivo" />
                                </div>

                                <div>
                                  <Label>Color</Label>
                                  <input type="color" value={newItem.color} onChange={(e) => setNewItem({ ...newItem, color: e.target.value })} className="w-full h-10 rounded-md border cursor-pointer" />
                                </div>
                                <Button onClick={() => createCourseMutation.mutate(newItem)} className="w-full bg-primary hover:bg-primary/90">
                                  Crear curso
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                      </div>
                    </div>

                    {/* Course Cards */}
                    {visibleCourses.length > 0 && (
                      <div className="mb-8">
                        <DroppableArea droppableId="root-courses" type="COURSE" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {visibleCourses.map((course, index) => (
                            <DraggableItem key={course.id} id={course.id} index={index} isAdmin={canEdit}>
                              <CourseCard
                                course={course}
                                subjectCount={subjects.filter(s => sameId(s.course_id, course.id)).length}
                                isAdmin={canEdit}
                                onEdit={setEditingCourse}
                                onDelete={(id) => deleteCourseMutation.mutate(id)}
                                onClick={() => { setSelectedCourse(course); setView('subjects'); }}
                              />
                            </DraggableItem>
                          ))}
                        </DroppableArea>
                      </div>
                    )}

                    {/* Materias sin curso (Oculto por requerimiento) */}
                    {/* {unassignedSubjects.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" /> Materias
                    </h2>
                    <DroppableArea droppableId="root-subjects" type="SUBJECT" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {unassignedSubjects.map((subject, index) => (
                        <DraggableItem key={subject.id} id={subject.id} index={index} isAdmin={canEdit}>
                          <SubjectCard
                            subject={subject}
                            quizCount={quizzes.filter(q => sameId(q.subject_id, subject.id)).length}
                            stats={getSubjectStats(subject.id)}
                            isAdmin={canEdit}
                            onDelete={(id) => deleteSubjectMutation.mutate(id)}
                            onEdit={setEditingSubject}
                            onClick={() => { setSelectedSubject(subject); setView('list'); }}
                            onReviewWrong={handleReviewWrongBySubject}
                          />
                        </DraggableItem>
                      ))}
                    </DroppableArea>
                  </div>
                )} */}

                    {visibleCourses.length === 0 && unassignedSubjects.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 px-4 rounded-2xl bg-white/60 border border-slate-200/50">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                          <BookOpen className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1.5">
                          {isAdmin ? 'Sin contenido aún' : 'Sin acceso a cursos'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 text-center max-w-sm leading-relaxed">
                          {isAdmin
                            ? 'Crea tu primer curso para comenzar a organizar el contenido.'
                            : 'Ingresa un código de curso para acceder al contenido.'}
                        </p>
                        {!isAdmin && (
                          <Button
                            onClick={() => setShowJoinModal(true)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Ingresar código
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Explorer Mode - Unified */}
                {explorerMode && !editingCourse && !editingSubject && !editingFolder && !editingQuiz && (
                  <motion.div key="explorer-unified" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Explorador</h1>
                        <p className="text-sm text-slate-500 mt-1">Arrastra elementos para organizarlos</p>
                      </div>
                      <Button
                        onClick={() => setExplorerMode(false)}
                        variant="outline"
                        className="text-xs sm:text-sm h-9"
                      >
                        Salir
                      </Button>
                    </div>

                    <FileExplorer
                      containers={buildContainers(courses, folders, subjects)}
                      quizzes={quizzes}
                      isAdmin={isAdmin}
                      currentContainerId={null}
                      onMoveItems={async (items, targetId, targetType) => {
                        await moveItemsInBackend(items, targetId, targetType, {
                          updateFolder: (params) => updateFolderMutation.mutateAsync(params),
                          updateSubject: (params) => updateSubjectMutation.mutateAsync(params),
                          updateQuiz: (params) => updateQuizMutation.mutateAsync(params)
                        });
                        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
                        queryClient.invalidateQueries({ queryKey: ['subjects'] });
                        queryClient.invalidateQueries({ queryKey: ['folders'] });
                        queryClient.invalidateQueries({ queryKey: ['courses'] });
                      }}
                      onChangeType={async (itemId, fromType, toType) => {
                        try {
                          let originalItem;
                          if (fromType === 'course') {
                            originalItem = courses.find(c => c.id === itemId);
                          } else if (fromType === 'folder') {
                            originalItem = folders.find(f => f.id === itemId);
                          } else if (fromType === 'subject') {
                            originalItem = subjects.find(s => s.id === itemId);
                          }

                          if (!originalItem) return;

                          const { id, created_date, updated_date, created_by, ...commonData } = originalItem;

                          if (fromType === 'course') {
                            await client.entities.Course.delete(itemId);
                          } else if (fromType === 'folder') {
                            await client.entities.Folder.delete(itemId);
                          } else if (fromType === 'subject') {
                            await client.entities.Subject.delete(itemId);
                          }

                          if (toType === 'course') {
                            await client.entities.Course.create(commonData);
                          } else if (toType === 'folder') {
                            await client.entities.Folder.create(commonData);
                          } else if (toType === 'subject') {
                            await client.entities.Subject.create(commonData);
                          }

                          queryClient.invalidateQueries({ queryKey: ['courses'] });
                          queryClient.invalidateQueries({ queryKey: ['folders'] });
                          queryClient.invalidateQueries({ queryKey: ['subjects'] });
                        } catch (error) {
                          console.error('Error cambiando tipo:', error);
                        }
                      }}
                      onItemClick={(type, item) => {
                        if (type === 'quiz') {
                          const quiz = quizzes.find(q => q.id === item.id);
                          if (quiz) {
                            setExplorerMode(false);
                            handleStartQuiz(quiz, quiz.total_questions, 'all', attempts.filter(a => a.quiz_id === quiz.id));
                          }
                        }
                      }}
                    />
                  </motion.div>
                )}

                {/* Subjects View (inside a course or folder) */}
                {view === 'subjects' && (selectedCourse || currentFolderId) && !editingCourse && !editingSubject && !editingFolder && !editingQuiz && !showBulkUploader && !showAIGenerator && !showUploader && !explorerMode && (
                  <motion.div key="subjects" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <BackNav />


                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                          {currentFolderId
                            ? folders.find(f => sameId(f.id, currentFolderId))?.name
                            : selectedSubject
                              ? selectedSubject.name
                              : selectedCourse?.name
                          }
                        </h1>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="text-xs sm:text-sm h-9"
                            onClick={() => setShowUploader(true)}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Subir JSON
                          </Button>
                          <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="text-xs sm:text-sm h-9">
                                <Folder className="w-4 h-4 mr-2" /> Nueva carpeta
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Crear carpeta (parcial)</DialogTitle></DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div>
                                  <Label>Nombre</Label>
                                  <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ej: Parcial 1" />
                                </div>
                                <Button onClick={() => createFolderMutation.mutate({ ...newItem, course_id: selectedCourse?.id, parent_id: currentFolderId })} className="w-full bg-primary hover:bg-primary/90">
                                  Crear carpeta
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          {!currentFolderId && (
                            <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                              <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-xs sm:text-sm h-9">
                                  <Plus className="w-4 h-4 mr-2" /> Nueva materia
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Crear nueva materia</DialogTitle></DialogHeader>
                                <div className="space-y-4 mt-4">
                                  <div>
                                    <Label>Nombre</Label>
                                    <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ej: Anatomía" />
                                  </div>

                                  <div>
                                    <Label>Color</Label>
                                    <input type="color" value={newItem.color} onChange={(e) => setNewItem({ ...newItem, color: e.target.value })} className="w-full h-10 rounded-md border cursor-pointer" />
                                  </div>
                                  <Button onClick={() => createSubjectMutation.mutate({ ...newItem, course_id: selectedCourse?.id, folder_id: currentFolderId })} className="w-full bg-primary hover:bg-primary/90">
                                    Crear materia
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tabs for Quizzes/Resources - Folder Level */}
                    <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
                      <button
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'quizzes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('quizzes')}
                      >
                        Cuestionarios ({currentLevelQuizzes.length})
                      </button>
                      <button
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'resources' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('resources')}
                      >
                        Recursos ({currentLevelResources.length})
                      </button>
                    </div>

                    {/* Resources Grid - Folder Level */}
                    {activeTab === 'resources' && (
                      <div className="mb-8">
                        {canEdit && (
                          <div className="flex justify-end mb-4">
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditingResource(null);
                                setShowResourceEditor(true);
                              }}
                              className="bg-primary hover:bg-primary/90"
                            >
                              <Upload className="w-4 h-4 mr-2" /> Subir Recurso
                            </Button>
                          </div>
                        )}
                        {currentLevelResources.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {currentLevelResources.map(resource => (
                              <ResourceCard
                                key={resource.id}
                                resource={resource}
                                canEdit={canEdit}
                                onClick={(r) => setViewingResource(r)}
                                onEdit={(r) => {
                                  setEditingResource(r);
                                  setShowResourceEditor(true);
                                }}
                                onDelete={(id) => {
                                  if (confirm('¿Estás seguro de eliminar este recurso?')) {
                                    deleteResourceMutation.mutate(id);
                                  }
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 rounded-2xl bg-white/60 border border-slate-200/50">
                            <p className="text-sm text-slate-500 mb-3">Sin recursos disponibles.</p>
                            {canEdit && (
                              <Button variant="outline" size="sm" onClick={() => { setEditingResource(null); setShowResourceEditor(true); }}>
                                Subir recurso
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content: Folders, Subjects, Quizzes */}
                    {/* Content: Folders, Subjects, Quizzes */}

                    <DroppableArea
                      droppableId={currentFolderId ? `folder-${currentFolderId}` : `course-${selectedCourse?.id}`}
                      type="FOLDER"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"
                    >
                      {currentCourseFolders.map((folder, index) => (
                        <DraggableItem key={folder.id} id={folder.id} index={index} isAdmin={canEdit}>
                          <FolderCard
                            folder={folder}
                            itemCount={subjects.filter(s => sameId(s.folder_id, folder.id)).length}
                            isAdmin={canEdit}
                            onDelete={(id) => deleteFolderMutation.mutate(id)}
                            onEdit={setEditingFolder}
                            onClick={() => setCurrentFolderId(folder.id)}
                          />
                        </DraggableItem>
                      ))}
                    </DroppableArea>
                    <DroppableArea
                      droppableId={currentFolderId ? `folder-${currentFolderId}` : `course-${selectedCourse?.id}`}
                      type="SUBJECT"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {currentFolderSubjects.map((subject, index) => (
                        <DraggableItem key={subject.id} id={subject.id} index={index} isAdmin={canEdit}>
                          <SubjectCard
                            subject={subject}
                            quizCount={getRecursiveQuizCount(subject.id)}
                            stats={getSubjectStats(subject.id)}
                            isAdmin={canEdit}
                            onDelete={(id) => deleteSubjectMutation.mutate(id)}
                            onEdit={setEditingSubject}
                            onClick={() => { setSelectedSubject(subject); setView('list'); }}
                            onReviewWrong={handleReviewWrongBySubject}
                          />
                        </DraggableItem>
                      ))}
                    </DroppableArea>


                    {/* Tabs de cuestionarios y audios dentro de carpeta */}
                    {currentFolderId && (
                      <div className="mt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-indigo-600" /> Cuestionarios ({currentFolderQuizzes.length})
                            </h2>
                            {canEdit && (
                              <Button onClick={() => setShowUploader(true)} size="sm" className="bg-primary hover:bg-primary/90">
                                <Upload className="w-4 h-4 mr-2" /> Subir Cuestionario (JSON)
                              </Button>
                            )}
                          </div>
                          {currentFolderQuizzes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-white/60 border border-slate-200/50">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <BookOpen className="w-6 h-6 text-slate-400" />
                              </div>
                              <h3 className="text-base font-bold text-slate-800 mb-1">Sin cuestionarios</h3>
                              <p className="text-sm text-slate-500 mb-4">Sube un archivo JSON para comenzar.</p>
                              {canEdit && (
                                <Button onClick={() => setShowUploader(true)} size="sm" className="bg-primary hover:bg-primary/90">
                                  <Upload className="w-4 h-4 mr-2" /> Subir JSON
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {currentFolderQuizzes.map((quiz) => (
                                <QuizListItem
                                  key={quiz.id}
                                  quiz={quiz}
                                  attempts={attempts.filter(a => a.quiz_id === quiz.id)}
                                  isAdmin={canEdit}
                                  onStart={handleStartQuiz}
                                  onEdit={setEditingQuiz}
                                  onDelete={(id) => deleteQuizMutation.mutate(id)}
                                  onStartSwipe={handleStartSwipeMode}
                                  onMove={setMovingQuiz}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!currentFolderId && currentCourseFolders.length === 0 && currentFolderSubjects.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-white/60 border border-slate-200/50">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                          <Folder className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">Sin contenido</h3>
                        <p className="text-sm text-slate-500 text-center max-w-xs">Crea carpetas o materias para organizar el contenido.</p>
                      </div>
                    )}
                  </motion.div>
                )}



                {/* File Uploader - Folder Level */}
                {view === 'subjects' && (selectedCourse || currentFolderId) && showUploader && (
                  <motion.div key="uploader-folder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button onClick={() => setShowUploader(false)} variant="ghost" className="mb-6">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                    </Button>
                    <FileUploader
                      onUploadSuccess={async (data) => {
                        await createQuizMutation.mutateAsync({
                          ...data,
                          folder_id: currentFolderId || null,
                          course_id: selectedCourse?.id || 'course_enarm2026'
                        });
                        setShowUploader(false);
                        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
                      }}
                      jsonOnly={true}
                    />
                  </motion.div>
                )}

                {/* File Uploader - Subject Level */}
                {view === 'list' && selectedSubject && showUploader && (
                  <motion.div key="uploader-subject" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button onClick={() => setShowUploader(false)} variant="ghost" className="mb-6">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Volver a {selectedSubject.name}
                    </Button>
                    <FileUploader
                      onUploadSuccess={async (data) => {
                        await createQuizMutation.mutateAsync({
                          ...data,
                          subject_id: selectedSubject.id,
                          course_id: selectedSubject.course_id || selectedCourse?.id || 'course_enarm2026',
                          folder_id: currentFolderId || null
                        });
                        setShowUploader(false);
                        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
                        toast.success('Cuestionario agregado a ' + selectedSubject.name);
                      }}
                      jsonOnly={true}
                    />
                  </motion.div>
                )}

                {/* Quiz List View */}
                {view === 'list' && selectedSubject && !showUploader && !editingQuiz && !showAIGenerator && !explorerMode && (
                  <div>
                    <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <BackNav />
  
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{selectedSubject.name}</h1>
                          <p className="text-sm text-slate-500 mt-1">{subjectQuizzes.length} {subjectQuizzes.length === 1 ? 'cuestionario' : 'cuestionarios'}</p>
                        </div>
                        {isAdmin && (
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setShowUploader(true)} variant="outline" className="text-xs sm:text-sm h-9">
                              <Upload className="w-4 h-4 mr-2" /> Subir JSON
                            </Button>

                            <Button onClick={() => setEditingQuiz({ title: '', subject_id: selectedSubject.id, questions: [] })} className="bg-primary hover:bg-primary/90 text-xs sm:text-sm h-9">
                              <Plus className="w-4 h-4 mr-2" /> Nuevo
                            </Button>

                            <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="text-xs sm:text-sm h-9">
                                  <FolderPlus className="w-4 h-4 mr-2" /> Carpeta
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Crear carpeta en {selectedSubject.name}</DialogTitle></DialogHeader>
                                <div className="space-y-4 mt-4">
                                  <div>
                                    <Label>Nombre</Label>
                                    <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ej: Módulo 1" />
                                  </div>
                                  <Button onClick={() => createFolderMutation.mutate({ ...newItem, subject_id: selectedSubject.id })} className="w-full bg-primary hover:bg-primary/90">
                                    Crear carpeta
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>


                      {/* Carpetas dentro de la materia con droppable */}
                      {folders.filter(f => sameId(f.subject_id, selectedSubject.id) && !f.parent_id).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          {folders.filter(f => sameId(f.subject_id, selectedSubject.id) && !f.parent_id).map((folder) => (
                            <DroppableArea key={folder.id} droppableId={`folder-${folder.id}`} type="QUIZ" className="h-full">
                              <FolderCard
                                folder={folder}
                                itemCount={quizzes.filter(q => sameId(q.folder_id, folder.id)).length}
                                isAdmin={isAdmin}
                                onDelete={(id) => deleteFolderMutation.mutate(id)}
                                onEdit={setEditingFolder}
                                onClick={() => { setCurrentFolderId(folder.id); setView('subjects'); }}
                              />
                            </DroppableArea>
                          ))}
                        </div>
                      )}

                      {selectedQuizzes.length > 0 && isAdmin && (
                        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                          <span className="text-sm font-medium text-indigo-900">
                            {selectedQuizzes.length} cuestionario{selectedQuizzes.length > 1 ? 's' : ''} seleccionado{selectedQuizzes.length > 1 ? 's' : ''}
                          </span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedQuizzes([])}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      {subjectQuizzes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-white/60 border border-slate-200/50">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                            <BookOpen className="w-6 h-6 text-slate-400" />
                          </div>
                          <h3 className="text-base font-bold text-slate-800 mb-1">Sin cuestionarios</h3>
                          <p className="text-sm text-slate-500 mb-5 text-center max-w-xs">
                            Sube un archivo JSON o crea uno manualmente.
                          </p>
                          {isAdmin && (
                            <div className="flex flex-wrap gap-2 justify-center">
                              <Button onClick={() => setShowUploader(true)} variant="outline" size="sm">
                                <Upload className="w-4 h-4 mr-2" /> Subir JSON
                              </Button>
                              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => setEditingQuiz({ title: '', subject_id: selectedSubject.id, questions: [] })}>
                                <Plus className="w-4 h-4 mr-2" /> Crear
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <DroppableArea droppableId={`subject-${selectedSubject.id}`} type="QUIZ" className="space-y-2.5">
                          {subjectQuizzes.map((quiz, index) => (
                            <DraggableItem key={quiz.id} id={quiz.id} index={index} isAdmin={isAdmin}>
                              <QuizListItem
                                quiz={quiz}
                                attempts={attempts.filter(a => a.quiz_id === quiz.id)}
                                isAdmin={isAdmin}
                                onStart={handleStartQuiz}
                                onEdit={setEditingQuiz}
                                onDelete={(id) => deleteQuizMutation.mutate(id)}
                                onStartSwipe={handleStartSwipeMode}
                                onMove={setMovingQuiz}
                                isSelected={selectedQuizzes.includes(quiz.id)}
                                onSelect={(id) => {
                                  if (selectedQuizzes.includes(id)) {
                                    setSelectedQuizzes(selectedQuizzes.filter(qId => qId !== id));
                                  } else {
                                    setSelectedQuizzes([...selectedQuizzes, id]);
                                  }
                                }}
                              />
                            </DraggableItem>
                          ))}
                        </DroppableArea>
                      )}
                    </motion.div>
                  </div>
                )}





                {/* Quiz View */}
                {view === 'quiz' && selectedQuiz && !swipeMode && (
                  <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <QuestionView
                      key={currentQuestionIndex}
                      question={selectedQuiz.questions[currentQuestionIndex]}
                      questionNumber={currentQuestionIndex + 1}
                      totalQuestions={selectedQuiz.questions.length}
                      correctAnswers={score}
                      wrongAnswers={wrongAnswers.length}
                      onAnswer={handleAnswer}
                      onBack={handleExitQuiz}
                      previousAttempts={attempts.filter(a => a.quiz_id === selectedQuiz.id)}
                      quizId={selectedQuiz.id}
                      userEmail={currentUser?.email}
                      settings={quizSettings}
                      quizTitle={selectedQuiz.title}
                      subjectId={selectedQuiz.subject_id}
                      sessionId={currentSessionId}
                      onMarkForReview={handleMarkForReview}
                      initialIsMarked={markedQuestions.has(selectedQuiz.questions[currentQuestionIndex].id || selectedQuiz.questions[currentQuestionIndex].question)}
                    />
                  </motion.div>
                )}

                {/* Swipe Quiz Mode */}
                {view === 'quiz' && selectedQuiz && swipeMode && (
                  <motion.div key="swipe-quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <SwipeQuizMode
                      questions={selectedQuiz.questions}
                      onComplete={handleSwipeComplete}
                      onExit={handleExitQuiz}
                    />
                  </motion.div>
                )}

                {/* Results View */}
                {view === 'results' && selectedQuiz && (
                  <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <ResultsView
                      score={score}
                      totalQuestions={selectedQuiz.questions.length}
                      wrongAnswers={wrongAnswers}
                      correctAnswers={correctAnswers}
                      answeredQuestions={score + wrongAnswers.length}
                      isPartial={score + wrongAnswers.length < selectedQuiz.questions.length}
                      onRetry={handleRetry}
                      onRetryWrong={handleRetryWrongQuestions}
                      onHome={() => { setSelectedQuiz(null); setView('list'); }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>


              {/* Course Join Modal */}
              <CourseJoinModal
                open={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                currentUser={currentUser}
              />

              {/* Resume Quiz Modal */}
              <ResumeQuizModal
                open={resumeModalState.open}
                onClose={() => setResumeModalState(prev => ({ ...prev, open: false }))}
                onResume={handleResumeFromModal}
                onRestart={handleRestartFromModal}
                quizTitle={resumeModalState.quiz?.title || resumeModalState.quiz?.m?.t || 'Cuestionario'}
                currentQuestion={resumeModalState.currentQuestion}
                totalQuestions={resumeModalState.totalQuestions}
                score={resumeModalState.score}
              />
            </div>
          </div>
        </DragDropContext >

        {/* Resource Editor Modal */}
        {
          showResourceEditor && (
            <ResourceEditor
              open={showResourceEditor}
              onOpenChange={setShowResourceEditor}
              resource={editingResource}
              parentContext={{
                course_id: selectedCourse?.id,
                subject_id: selectedSubject?.id,
                folder_id: currentFolderId
              }}
              onSave={async (data) => {
                if (editingResource) {
                  await updateResourceMutation.mutateAsync({ id: editingResource.id, data });
                } else {
                  await createResourceMutation.mutateAsync(data);
                }
              }}
            />
          )
        }

        {/* Resource Viewer Modal */}
        {
          viewingResource && (
            <ResourceViewer
              open={!!viewingResource}
              onOpenChange={(open) => !open && setViewingResource(null)}
              resource={viewingResource}
            />
          )
        }
      </div >
    </div >
  );
}
