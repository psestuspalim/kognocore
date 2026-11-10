import { LayoutDashboard, BookOpen, Users, FileJson, FolderTree, Trash2, TrendingUp, UserPlus, Flag } from "lucide-react";

export const adminNavigation = [
  {
    section: 'Admin',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: 'AdminHome' },
      { label: 'Contenido', icon: FolderTree, href: 'AdminContent' },
      { label: 'Revisión de preguntas', icon: Flag, href: 'AdminQuestionReviews' },
      { label: 'Progreso', icon: TrendingUp, href: 'AdminProgress' },
      { label: 'Papelera', icon: Trash2, href: 'AdminTrash' },
      { label: 'Estudiantes', icon: Users, href: 'AdminStudents' },
      { label: 'Generar usuarios', icon: UserPlus, href: 'AdminUserGenerator' },
      { label: 'JSON Manager', icon: FileJson, href: 'AdminJsonManager' }
    ]
  },
  {
    section: 'Operaciones',
    items: [
      { label: 'Cursos y códigos', icon: BookOpen, href: 'CourseManagement' },

    ]
  }
];

