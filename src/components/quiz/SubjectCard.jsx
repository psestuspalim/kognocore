import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Trash2, Pencil, EyeOff, Users, RotateCcw, CheckCircle2, FlaskConical } from 'lucide-react';
import { buildPalette } from '@/utils/theme';

// Materias → Paleta Esmeralda / Teal (ciencias de la salud, conocimiento, vida)
export default function SubjectCard({ subject, quizCount, stats, onClick, onDelete, onEdit, isAdmin, onReviewWrong }) {
  const { totalCorrect = 0, totalWrong = 0, totalAnswered = 0 } = stats || {};
  const correctPercentage = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;

  const p = buildPalette(subject.color || '#10b981');

  return (
    <div>
      <Card
        onClick={onClick}
        className="cursor-pointer transition-all duration-150 overflow-hidden relative group bg-white/95 rounded-2xl border shadow-sm hover:-translate-y-[1px] hover:shadow-md"
        style={{
          background: p.cardBg,
          border: `1px solid ${p.borderHover}`,
          boxShadow: p.shadow,
          borderLeft: `5px solid ${subject.color || '#10b981'}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Subtle top gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 opacity-60"
          style={{ background: p.accentLine }}
        />

        {/* Top label chip */}
        <div className="px-4 pt-3 pb-0">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.1em] uppercase rounded-full px-2.5 py-0.5 border"
            style={{ color: p.chipText, background: p.chipBg, borderColor: p.chipBorder }}
          >
            <FlaskConical className="w-3 h-3" />
            Materia
          </span>
        </div>

        <CardContent className="p-4 pt-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: p.iconBg, border: `1px solid ${p.chipBorder}` }}
              >
                <BookOpen className="w-6 h-6" style={{ color: p.iconColor }} />
              </div>

              {/* Name + badges */}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 truncate">
                  {subject.name}
                  {subject.is_hidden && <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                  {subject.visibility === 'specific' && <Users className="w-3.5 h-3.5" style={{ color: p.iconColor }} />}
                </h3>

                {subject.code && (
                  <p className="text-[11px] font-mono font-medium mt-0.5" style={{ color: p.textDim }}>{subject.code}</p>
                )}

                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <Badge
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border hover:opacity-90"
                    style={{ background: p.badgeBg, color: p.badgeText, borderColor: p.badgeBorder }}
                  >
                    {quizCount} {quizCount === 1 ? 'cuestionario' : 'cuestionarios'}
                  </Badge>
                  {totalAnswered > 0 && (
                    <Badge
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${correctPercentage >= 70
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {Math.round(correctPercentage)}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <Button variant="ghost" size="icon"
                    onClick={(e) => { e.stopPropagation(); onEdit(subject); }}
                    className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-white/60 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="icon"
                    onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50/70 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Review wrong answers */}
          {totalWrong > 0 && onReviewWrong && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: p.borderHover }}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-8 text-red-700 hover:bg-red-50 hover:text-red-800 p-0 justify-start px-2 rounded-md"
                onClick={(e) => { e.stopPropagation(); onReviewWrong(subject.id); }}
              >
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Repasar {totalWrong} preguntas falladas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
