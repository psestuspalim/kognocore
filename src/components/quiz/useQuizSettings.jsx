import { useState, useEffect } from 'react';
import { client } from '@/api/client';

const DEFAULT_SETTINGS = {
  show_options: true,
  show_feedback: true,
  show_reflection: false,
  show_error_analysis: false,
  show_schema: false,
  show_notes: false,
  show_hint: false
};

export default function useQuizSettings(quizId, subjectId, folderId, courseId) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [quizId, subjectId, folderId, courseId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Obtener todas las configuraciones relevantes
      const allSettings = await client.entities.QuizSettings.list();
      
      // Buscar configuraciones en orden de prioridad (más específico primero)
      const quizSettings = allSettings.find(s => s.entity_type === 'quiz' && s.entity_id === quizId);
      const subjectSettings = allSettings.find(s => s.entity_type === 'subject' && s.entity_id === subjectId);
      const folderSettings = allSettings.find(s => s.entity_type === 'folder' && s.entity_id === folderId);
      const courseSettings = allSettings.find(s => s.entity_type === 'course' && s.entity_id === courseId);

      // Aplicar herencia: quiz > subject > folder > course > default
      const mergedSettings = {
        ...DEFAULT_SETTINGS,
        ...(courseSettings && extractSettings(courseSettings)),
        ...(folderSettings && extractSettings(folderSettings)),
        ...(subjectSettings && extractSettings(subjectSettings)),
        ...(quizSettings && extractSettings(quizSettings))
      };

      setSettings(mergedSettings);
    } catch (error) {
      console.error('Error loading quiz settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading };
}

function extractSettings(settingsObj) {
  return {
    show_options: settingsObj.show_options,
    show_feedback: settingsObj.show_feedback,
    show_reflection: settingsObj.show_reflection,
    show_error_analysis: settingsObj.show_error_analysis,
    show_schema: settingsObj.show_schema,
    show_notes: settingsObj.show_notes,
    show_hint: settingsObj.show_hint
  };
}