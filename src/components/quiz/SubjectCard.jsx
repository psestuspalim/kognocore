import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Book, Trash2, Pencil, EyeOff, Users, RotateCcw, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SubjectCard({ subject, quizCount, stats, onClick, onDelete, onEdit, isAdmin, onReviewWrong }) {
  const { totalCorrect = 0, totalWrong = 0, totalAnswered = 0 } = stats || {};
  const correctPercentage = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        onClick={onClick}
        className="cursor-pointer hover:shadow-lg transition-all border-l-4 overflow-hidden bg-white"
        style={{ borderLeftColor: subject.color || '#f59e0b' }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon Container */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: (subject.color || '#f59e0b') + '20' }}
              >
                <Book className="w-6 h-6" style={{ color: subject.color || '#f59e0b' }} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 truncate">
                  {subject.name}
                  {subject.is_hidden && <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                  {subject.visibility === 'specific' && <Users className="w-3.5 h-3.5 text-blue-500" />}
                </h3>

                {subject.description && (
                  <p className="text-sm text-gray-500 line-clamp-1 mb-1.5">{subject.description}</p>
                )}

                <div className="flex items-center flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-500/10 hover:bg-gray-100 transition-colors">
                    {quizCount} {quizCount === 1 ? 'cuestionario' : 'cuestionarios'}
                  </Badge>

                  {/* Progress Badge if started */}
                  {totalAnswered > 0 && (
                    <Badge variant="outline" className={`text-xs h-5 px-1.5 border gap-1 ${correctPercentage >= 70 ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-600 border-gray-200'}`}>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); onEdit(subject); }}
                    className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }}
                    className="h-8 w-8 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Review Action - Only if there are wrongs */}
          {totalWrong > 0 && onReviewWrong && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7 text-red-600 hover:bg-red-50 hover:text-red-700 p-0 justify-start px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onReviewWrong(subject.id);
                }}
              >
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Repasar {totalWrong} preguntas falladas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}