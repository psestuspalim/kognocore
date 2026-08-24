import { useState, useMemo } from 'react';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileJson, Loader2, FolderDown, ChevronRight, ChevronDown, Folder, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function QuizExporter({ onClose }) {
  const [exporting, setExporting] = useState(false);
  const [exportedCount, setExportedCount] = useState(0);
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());

  const { data: quizzes = [], isLoading: loadingQuizzes } = useQuery({
    queryKey: ['all-quizzes'],
    queryFn: () => client.entities.Quiz.list('-created_date'),
  });

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => client.entities.Subject.list(),
  });

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => client.entities.Course.list(),
  });

  const { data: folders = [], isLoading: loadingFolders } = useQuery({
    queryKey: ['folders'],
    queryFn: () => client.entities.Folder.list(),
  });

  const isLoading = loadingQuizzes || loadingSubjects || loadingCourses || loadingFolders;

  // Organize quizzes by hierarchy: Course > Subject > Folder
  const organizedData = useMemo(() => {
    const structure = {};

    quizzes.forEach(quiz => {
      const subject = subjects.find(s => s.id === quiz.subject_id);
      const course = courses.find(c => c.id === subject?.course_id);
      const folder = folders.find(f => f.id === quiz.folder_id);

      const courseName = course?.name || 'Sin Curso';
      const subjectName = subject?.name || 'Sin Materia';
      const folderName = folder?.name || 'Sin Carpeta';

      if (!structure[courseName]) {
        structure[courseName] = { course, subjects: {} };
      }
      if (!structure[courseName].subjects[subjectName]) {
        structure[courseName].subjects[subjectName] = { subject, folders: {} };
      }
      if (!structure[courseName].subjects[subjectName].folders[folderName]) {
        structure[courseName].subjects[subjectName].folders[folderName] = { folder, quizzes: [] };
      }

      structure[courseName].subjects[subjectName].folders[folderName].quizzes.push(quiz);
    });

    return structure;
  }, [quizzes, subjects, courses, folders]);

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sanitizeFilename = (name) => {
    return name.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '').replace(/\s+/g, '_');
  };

  const createExportData = (quiz, courseName, subjectName, folderName) => ({
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions,
    total_questions: quiz.total_questions,
    metadata: {
      course: courseName,
      subject: subjectName,
      folder: folderName,
      created_date: quiz.created_date,
      file_name: quiz.file_name
    }
  });

  const handleExportAll = async () => {
    setExporting(true);
    setExportedCount(0);

    try {
      for (const [courseName, courseData] of Object.entries(organizedData)) {
        for (const [subjectName, subjectData] of Object.entries(courseData.subjects)) {
          for (const [folderName, folderData] of Object.entries(subjectData.folders)) {
            for (const quiz of folderData.quizzes) {
              const safeCourse = sanitizeFilename(courseName);
              const safeSubject = sanitizeFilename(subjectName);
              const safeFolder = sanitizeFilename(folderName);
              const safeQuiz = sanitizeFilename(quiz.title);
              const filename = `${safeCourse}_${safeSubject}_${safeFolder}_${safeQuiz}.json`;

              const exportData = createExportData(quiz, courseName, subjectName, folderName);
              downloadJSON(exportData, filename);
              setExportedCount(prev => prev + 1);

              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
      }

      toast.success(`${quizzes.length} quizzes exportados exitosamente`);
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error('Error al exportar algunos quizzes');
    } finally {
      setExporting(false);
    }
  };

  const handleExportFolder = async (courseName, subjectName, folderName, folderQuizzes) => {
    setExporting(true);
    setExportedCount(0);

    try {
      for (const quiz of folderQuizzes) {
        const safeCourse = sanitizeFilename(courseName);
        const safeSubject = sanitizeFilename(subjectName);
        const safeFolder = sanitizeFilename(folderName);
        const safeQuiz = sanitizeFilename(quiz.title);
        const filename = `${safeCourse}_${safeSubject}_${safeFolder}_${safeQuiz}.json`;

        const exportData = createExportData(quiz, courseName, subjectName, folderName);
        downloadJSON(exportData, filename);
        setExportedCount(prev => prev + 1);

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast.success(`${folderQuizzes.length} quizzes de "${folderName}" exportados`);
    } catch (error) {
      console.error('Error exportando carpeta:', error);
      toast.error('Error al exportar carpeta');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSingle = (quiz, courseName, subjectName, folderName) => {
    const safeCourse = sanitizeFilename(courseName);
    const safeSubject = sanitizeFilename(subjectName);
    const safeFolder = sanitizeFilename(folderName);
    const safeQuiz = sanitizeFilename(quiz.title);
    const filename = `${safeCourse}_${safeSubject}_${safeFolder}_${safeQuiz}.json`;

    const exportData = createExportData(quiz, courseName, subjectName, folderName);
    downloadJSON(exportData, filename);
    toast.success('Quiz exportado');
  };

  const toggleCourse = (courseName) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseName)) {
      newExpanded.delete(courseName);
    } else {
      newExpanded.add(courseName);
    }
    setExpandedCourses(newExpanded);
  };

  const toggleSubject = (key) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubjects(newExpanded);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderDown className="w-5 h-5 text-indigo-600" />
            Exportar Quizzes
          </CardTitle>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Descarga quizzes organizados por curso, materia y carpeta
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-indigo-900">
                {quizzes.length} quizzes disponibles
              </p>
              <p className="text-sm text-indigo-700 mt-1">
                Organizados por estructura jerárquica
              </p>
            </div>
            <Button
              onClick={handleExportAll}
              disabled={exporting || quizzes.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {exportedCount}/{quizzes.length}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar todos
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="border rounded-lg max-h-96 overflow-y-auto">
          {Object.entries(organizedData).map(([courseName, courseData]) => (
            <div key={courseName} className="border-b last:border-b-0">
              <button
                onClick={() => toggleCourse(courseName)}
                className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 text-left"
              >
                {expandedCourses.has(courseName) ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-900">{courseName}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {Object.values(courseData.subjects).reduce((acc, s) =>
                    acc + Object.values(s.folders).reduce((a, f) => a + f.quizzes.length, 0), 0
                  )} quizzes
                </span>
              </button>

              {expandedCourses.has(courseName) && (
                <div className="pl-6 bg-gray-50">
                  {Object.entries(courseData.subjects).map(([subjectName, subjectData]) => {
                    const subjectKey = `${courseName}-${subjectName}`;
                    return (
                      <div key={subjectKey} className="border-t">
                        <button
                          onClick={() => toggleSubject(subjectKey)}
                          className="w-full flex items-center gap-2 p-3 hover:bg-gray-100 text-left"
                        >
                          {expandedSubjects.has(subjectKey) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          <Folder className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-800">{subjectName}</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {Object.values(subjectData.folders).reduce((a, f) => a + f.quizzes.length, 0)} quizzes
                          </span>
                        </button>

                        {expandedSubjects.has(subjectKey) && (
                          <div className="pl-6 bg-white">
                            {Object.entries(subjectData.folders).map(([folderName, folderData]) => (
                              <div key={folderName} className="border-t p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Folder className="w-4 h-4 text-amber-600" />
                                    <span className="text-sm font-medium text-gray-700">{folderName}</span>
                                    <span className="text-xs text-gray-500">({folderData.quizzes.length})</span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExportFolder(courseName, subjectName, folderName, folderData.quizzes)}
                                    disabled={exporting}
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Carpeta
                                  </Button>
                                </div>
                                <div className="space-y-1 ml-6">
                                  {folderData.quizzes.map(quiz => (
                                    <div key={quiz.id} className="flex items-center justify-between py-1 text-sm">
                                      <span className="text-gray-600 truncate">{quiz.title}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleExportSingle(quiz, courseName, subjectName, folderName)}
                                        disabled={exporting}
                                        className="ml-2"
                                      >
                                        <FileJson className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}