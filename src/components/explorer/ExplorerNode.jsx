import React, { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, BookOpen, FileText, Book, ChevronDown, MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const typeIcons = {
  course: Book,
  folder: Folder,
  subject: BookOpen,
  quiz: FileText
};

const ExplorerNode = memo(function ExplorerNode({
  item,
  type,
  index,
  isAdmin,
  isSelected,
  isExpanded,
  isDragOver,
  hasChildren,
  children,
  onToggleSelect,
  onToggleExpand,
  onItemClick,
  onChangeType
}) {
  const Icon = typeIcons[type] || FileText;
  const key = `${type}-${item.id}`;

  const handleCheckboxChange = useCallback(() => {
    onToggleSelect(key);
  }, [key, onToggleSelect]);

  const handleExpandClick = useCallback((e) => {
    e.stopPropagation();
    onToggleExpand(item.id);
  }, [item.id, onToggleExpand]);

  const handleItemClick = useCallback(() => {
    if (hasChildren) {
      onToggleExpand(item.id);
    }
    if (onItemClick) {
      onItemClick(type, item);
    }
  }, [hasChildren, onItemClick, onToggleExpand, type, item]);

  const handleConvertToCourse = useCallback((e) => {
    e.stopPropagation();
    onChangeType(item.id, type, 'course');
  }, [item.id, type, onChangeType]);

  const handleConvertToFolder = useCallback((e) => {
    e.stopPropagation();
    onChangeType(item.id, type, 'folder');
  }, [item.id, type, onChangeType]);

  const handleConvertToSubject = useCallback((e) => {
    e.stopPropagation();
    onChangeType(item.id, type, 'subject');
  }, [item.id, type, onChangeType]);

  return (
    <Draggable draggableId={key} index={index} isDragDisabled={!isAdmin}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all group ${isSelected
              ? 'bg-indigo-50 border-indigo-400'
              : isDragOver
                ? 'bg-amber-50 border-amber-400 shadow-lg'
                : 'bg-white border-gray-200 hover:border-gray-300'
              } ${snapshot.isDragging ? 'shadow-2xl opacity-90' : ''}`}
          >
            {isAdmin && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={handleCheckboxChange}
                className="shrink-0"
              />
            )}

            {type !== 'quiz' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpandClick}
                className="h-6 w-6 p-0"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'} ${!hasChildren ? 'opacity-30' : ''}`}
                />
              </Button>
            )}

            <div
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              onClick={handleItemClick}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${item.color || '#6366f1'}20` }}
              >
                {item.icon && item.icon !== 'GraduationCap' && item.icon !== 'Book' ? (
                  <span className="text-sm">{item.icon}</span>
                ) : (
                  <Icon className="w-4 h-4" style={{ color: item.color || '#6366f1' }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.name || item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                )}
              </div>

              {item.is_hidden && (
                <Badge variant="outline" className="text-xs">Oculto</Badge>
              )}

              {isAdmin && type !== 'quiz' && (
                <Badge variant="outline" className="text-xs font-mono bg-gray-50 text-gray-600">
                  ID: {item.id.slice(0, 8)}
                </Badge>
              )}
            </div>

            {isAdmin && type !== 'quiz' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleConvertToCourse} disabled={type === 'course'}>
                    <Book className="w-4 h-4 mr-2" />
                    Convertir a Curso
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleConvertToFolder} disabled={type === 'folder'}>
                    <Folder className="w-4 h-4 mr-2" />
                    Convertir a Carpeta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleConvertToSubject} disabled={type === 'subject'}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Convertir a Materia
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Children */}
          <AnimatePresence>
            {isExpanded && type !== 'quiz' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-8 mt-2"
              >
                <Droppable droppableId={`${type}-${item.id}`} type="ITEM">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 p-2 rounded-lg border-2 border-dashed min-h-[60px] ${snapshot.isDraggingOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
                        }`}
                    >
                      {children}
                      {provided.placeholder}
                      {(!children || children.length === 0) && (
                        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic pointer-events-none">
                          Arrastra elementos aquí
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Draggable>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isDragOver === nextProps.isDragOver &&
    prevProps.hasChildren === nextProps.hasChildren &&
    prevProps.children?.length === nextProps.children?.length
  );
});

export default ExplorerNode;