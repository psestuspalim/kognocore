import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folder, Trash2, Pencil, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FolderCard({ folder, itemCount, isAdmin, onDelete, onEdit, onClick }) {
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
        style={{ borderLeftColor: folder.color || '#f59e0b' }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon Container */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: (folder.color || '#f59e0b') + '20' }}
              >
                <Folder className="w-6 h-6" style={{ color: folder.color || '#f59e0b' }} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 truncate">
                  {folder.name}
                  {folder.is_hidden && <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                </h3>

                {folder.description && (
                  <p className="text-sm text-gray-500 line-clamp-1 mb-1.5">{folder.description}</p>
                )}

                <div className="flex items-center flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-500/10 hover:bg-gray-100 transition-colors">
                    {itemCount} {itemCount === 1 ? 'elemento' : 'elementos'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onEdit(folder); }}
                  className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
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