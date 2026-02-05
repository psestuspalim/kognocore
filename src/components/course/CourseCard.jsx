import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Book, Users, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';

export default function CourseCard({ course, subjectCount, isAdmin, onEdit, onDelete, onClick }) {
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
        style={{ borderLeftColor: course.color || '#6366f1' }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${course.color}20` || '#6366f120' }}
              >
                <Icon
                  name={course.icon}
                  className="w-6 h-6"
                  style={{ color: course.color || '#6366f1' }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 truncate">
                  {course.name}
                  {course.is_hidden && <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                </h3>
                {course.description && (
                  <p className="text-sm text-gray-500 line-clamp-1 mb-1.5">{course.description}</p>
                )}
                <div className="flex items-center flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-500/10 hover:bg-gray-100 transition-colors">
                    <Book className="w-3 h-3 mr-1.5 text-gray-500" />
                    {subjectCount} {subjectCount === 1 ? 'materia' : 'materias'}
                  </Badge>
                  {course.visibility === 'specific' && (
                    <Badge variant="outline" className="text-xs h-5 px-1.5 text-blue-600 border-blue-200 bg-blue-50">
                      <Users className="w-3 h-3 mr-1" />
                      {course.allowed_users?.length || 0} usuarios
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(course)}
                  className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(course.id)}
                  className="h-8 w-8 text-gray-400 hover:text-red-600"
                >
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