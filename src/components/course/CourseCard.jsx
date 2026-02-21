import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, GraduationCap, Users, EyeOff, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';

import { buildPalette } from '@/utils/theme';


export default function CourseCard({ course, subjectCount, isAdmin, onEdit, onDelete, onClick }) {
  const p = buildPalette(course.color || '#7c3aed');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.025, y: -3 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        onClick={onClick}
        className="cursor-pointer transition-all overflow-hidden relative group bg-white"
        style={{
          background: p.cardBg,
          border: `1px solid ${p.border}`,
          boxShadow: p.shadow,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Accent top line */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: p.accentLine }}
        />

        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg"
          style={{ boxShadow: `inset 0 0 0 1px ${p.borderHover}`, background: `radial-gradient(ellipse at top, ${p.glow} 0%, transparent 65%)` }}
        />

        {/* Label chip */}
        <div className="px-4 pt-4 pb-0">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase rounded-full px-2.5 py-0.5 border"
            style={{ color: p.chipText, background: p.chipBg, borderColor: p.chipBorder }}
          >
            <GraduationCap className="w-3 h-3" />
            Semestre
          </span>
        </div>

        <CardContent className="p-4 pt-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon bubble */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: p.iconBg, border: `1px solid ${p.chipBorder}` }}
              >
                {course.icon
                  ? <Icon name={course.icon} className="w-6 h-6" style={{ color: p.iconColor }} />
                  : <GraduationCap className="w-6 h-6" style={{ color: p.iconColor }} />
                }
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800 text-base flex items-center gap-2 truncate">
                  {course.name}
                  {course.is_hidden && <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                </h3>
                <div className="flex items-center flex-wrap gap-2 mt-1.5">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{ background: p.badgeBg, color: p.badgeText, borderColor: p.badgeBorder }}
                  >
                    <BookOpen className="w-3 h-3 mr-1 inline-block" />
                    {subjectCount} {subjectCount === 1 ? 'materia' : 'materias'}
                  </Badge>
                  {course.visibility === 'specific' && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      style={{ background: p.badgeBg, color: p.badgeText, borderColor: p.badgeBorder }}
                    >
                      <Users className="w-3 h-3 mr-1 inline-block" />
                      {course.allowed_users?.length || 0}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => onEdit(course)}
                  className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-white/60">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(course.id)}
                  className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50/70">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}