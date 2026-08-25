import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, GraduationCap, Users, EyeOff, BookOpen, ChevronRight } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { buildPalette } from '@/utils/theme';

export default function CourseCard({ course, subjectCount, isAdmin, onEdit, onDelete, onClick }) {
  const p = buildPalette(course.color || '#7c3aed');

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer transition-all duration-150 overflow-hidden relative group rounded-xl border hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: p.cardBg,
        borderColor: p.border,
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: course.color || '#7c3aed' }} />

      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: p.iconBg }}
            >
              {course.icon
                ? <Icon name={course.icon} className="w-6 h-6" style={{ color: p.iconColor }} />
                : <GraduationCap className="w-6 h-6" style={{ color: p.iconColor }} />
              }
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5 truncate">
                {course.name}
                {course.is_hidden && <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {subjectCount} {subjectCount === 1 ? 'materia' : 'materias'}
                </span>
                {course.visibility === 'specific' && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {course.allowed_users?.length || 0}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => onEdit(course)}
                  className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-lg">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(course.id)}
                  className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
