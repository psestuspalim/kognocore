import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Trash2, Pencil, EyeOff, Users, RotateCcw, CheckCircle2 } from 'lucide-react';
import { buildPalette } from '@/utils/theme';

export default function SubjectCard({ subject, quizCount, stats, onClick, onDelete, onEdit, isAdmin, onReviewWrong }) {
  const { totalCorrect = 0, totalWrong = 0, totalAnswered = 0 } = stats || {};
  const correctPercentage = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;

  const p = buildPalette(subject.color || '#10b981');

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer transition-all duration-150 overflow-hidden relative group rounded-xl border hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: p.cardBg,
        borderColor: p.border,
        borderLeft: `4px solid ${subject.color || '#10b981'}`,
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: p.iconBg }}
            >
              <BookOpen className="w-5 h-5" style={{ color: p.iconColor }} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-[15px] truncate flex items-center gap-1.5">
                {subject.name}
                {subject.is_hidden && <EyeOff className="w-3 h-3 text-slate-400" />}
                {subject.visibility === 'specific' && <Users className="w-3 h-3" style={{ color: p.iconColor }} />}
              </h3>

              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-slate-500">{quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}</span>
                {totalAnswered > 0 && (
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${correctPercentage >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {Math.round(correctPercentage)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <Button variant="ghost" size="icon"
                  onClick={(e) => { e.stopPropagation(); onEdit(subject); }}
                  className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-lg">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon"
                  onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }}
                  className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {totalWrong > 0 && onReviewWrong && (
          <div className="mt-3 pt-2.5 border-t" style={{ borderColor: p.border }}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700 p-0 justify-start px-2 rounded-md"
              onClick={(e) => { e.stopPropagation(); onReviewWrong(subject.id); }}
            >
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Repasar {totalWrong} incorrectas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
