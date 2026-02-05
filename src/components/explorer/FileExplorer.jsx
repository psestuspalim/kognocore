import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2 } from 'lucide-react';
import { canMoveItemToTarget } from '../utils/contentTree';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import ExplorerNode from './ExplorerNode';

export default function FileExplorer({
  containers = [],
  quizzes = [],
  onMoveItems,
  onCopyItems,
  onItemClick,
  onChangeType,
  onDeleteItems,
  isAdmin = false,
  currentContainerId = null,
  selectedItems: externalSelectedItems,
  onSelectionChange
}) {
  const [internalSelectedKeys, setInternalSelectedKeys] = useState(new Set());
  const selectedKeys = externalSelectedItems !== undefined ? externalSelectedItems : internalSelectedKeys;
  const setSelectedKeys = onSelectionChange || setInternalSelectedKeys;

  const [clipboard, setClipboard] = useState(null);
  const [expandedContainers, setExpandedContainers] = useState(new Set());
  const [dragOverContainer, setDragOverContainer] = useState(null);

  // Step 1: Build indexed maps (O(n) once)
  const indices = useMemo(() => {
    const childrenByParent = new Map();
    const quizzesBySubject = new Map();
    const rootContainers = [];
    const rootQuizzes = [];

    // Index containers by parent_id
    containers.forEach(c => {
      const parentKey = c.parent_id || 'root';
      if (!childrenByParent.has(parentKey)) {
        childrenByParent.set(parentKey, []);
      }
      childrenByParent.get(parentKey).push(c);

      // Root detection
      if (c.type === 'course') {
        rootContainers.push(c);
      } else if (c.type === 'folder' && !c.course_id && !c.parent_id) {
        rootContainers.push(c);
      } else if (c.type === 'subject' && !c.course_id && !c.folder_id) {
        rootContainers.push(c);
      }
    });

    // Index quizzes by subject_id
    quizzes.forEach(q => {
      const subjectId = q.subject_id || 'root';
      if (!quizzesBySubject.has(subjectId)) {
        quizzesBySubject.set(subjectId, []);
      }
      quizzesBySubject.get(subjectId).push(q);

      if (!q.subject_id) {
        rootQuizzes.push(q);
      }
    });

    return { childrenByParent, quizzesBySubject, rootContainers, rootQuizzes };
  }, [containers, quizzes]);

  // Step 2: Selection helpers using Set
  const isSelected = useCallback((key) => selectedKeys.has(key), [selectedKeys]);

  const toggleSelect = useCallback((key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  // Step 4: Stabilize callbacks
  const cutItems = useCallback(() => {
    if (selectedKeys.size === 0) return;
    setClipboard({ items: Array.from(selectedKeys), operation: 'cut' });
    toast.info(`${selectedKeys.size} elementos cortados`);
  }, [selectedKeys]);

  const copyItems = useCallback(() => {
    if (selectedKeys.size === 0) return;
    setClipboard({ items: Array.from(selectedKeys), operation: 'copy' });
    toast.info(`${selectedKeys.size} elementos copiados`);
  }, [selectedKeys]);

  const pasteItems = useCallback(async (targetId, targetType) => {
    if (!clipboard) return;

    try {
      const itemsToProcess = clipboard.items.map(key => {
        const [type, id] = key.split('-');
        return { type, id };
      });

      const invalidMoves = itemsToProcess.filter(item =>
        !canMoveItemToTarget(item.type, targetType)
      );

      if (invalidMoves.length > 0) {
        toast.error(`No se pueden mover ${invalidMoves.length} elementos a este destino`);
        return;
      }

      if (clipboard.operation === 'cut') {
        await onMoveItems(itemsToProcess, targetId, targetType);
        toast.success('Elementos movidos correctamente');
      } else {
        const quizzesToCopy = itemsToProcess.filter(item => item.type === 'quiz');
        if (quizzesToCopy.length > 0) {
          await onCopyItems(quizzesToCopy, targetId);
          toast.success(`${quizzesToCopy.length} cuestionarios copiados`);
        }
      }

      if (clipboard.operation === 'cut') {
        setClipboard(null);
      }
      clearSelection();
    } catch (error) {
      toast.error(`Error al ${clipboard.operation === 'cut' ? 'mover' : 'copiar'} elementos`);
    }
  }, [clipboard, onMoveItems, onCopyItems, clearSelection]);

  const toggleExpand = useCallback((containerId) => {
    setExpandedContainers(prev => {
      const next = new Set(prev);
      if (next.has(containerId)) {
        next.delete(containerId);
      } else {
        next.add(containerId);
      }
      return next;
    });
  }, []);

  // O(1) lookup for children
  const getChildren = useCallback((containerId, containerType) => {
    const childContainers = indices.childrenByParent.get(containerId) || [];

    if (containerType === 'subject') {
      const childQuizzes = indices.quizzesBySubject.get(containerId) || [];
      return [...childContainers, ...childQuizzes];
    }

    return childContainers;
  }, [indices]);

  const handleDragEnd = useCallback(async (result) => {
    const { draggableId, destination, source } = result;
    setDragOverContainer(null);

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const [dragType, dragId] = draggableId.split('-');
    const [destType, destId] = destination.droppableId.split('-');

    const itemsToMove = selectedKeys.has(draggableId)
      ? Array.from(selectedKeys).map(key => {
        const [type, id] = key.split('-');
        return { type, id };
      })
      : [{ type: dragType, id: dragId }];

    try {
      if (destType === 'root') {
        await onMoveItems(itemsToMove, null, null);
      } else {
        const targetContainer = containers.find(c => c.id === destId);
        const targetType = targetContainer ? targetContainer.type : destType;
        await onMoveItems(itemsToMove, destId, targetType);
      }
      clearSelection();
      toast.success('Elementos movidos correctamente');
    } catch (error) {
      console.error('Error al mover:', error);
      toast.error('Error al mover elementos');
    }
  }, [selectedKeys, onMoveItems, containers, clearSelection]);

  // Step 6: Reduce drag-over re-renders
  const handleDragUpdate = useCallback((update) => {
    if (update.destination) {
      const [destType, destId] = update.destination.droppableId.split('-');
      if (destType !== 'root' && destId) {
        setDragOverContainer(prev => prev === destId ? prev : destId);
        setExpandedContainers(prev => {
          if (prev.has(destId)) return prev;
          return new Set([...prev, destId]);
        });
      }
    } else {
      setDragOverContainer(null);
    }
  }, []);

  // Step 3 & 5: Recursive render using memoized node
  const renderNode = useCallback((item, type, index) => {
    const key = `${type}-${item.id}`;
    const isExp = expandedContainers.has(item.id);
    const isDragOver = dragOverContainer === item.id;

    // O(1) check for children
    const childContainers = indices.childrenByParent.get(item.id) || [];
    const childQuizzes = type === 'subject' ? (indices.quizzesBySubject.get(item.id) || []) : [];
    const hasChildren = childContainers.length > 0 || childQuizzes.length > 0;

    return (
      <ExplorerNode
        key={key}
        item={item}
        type={type}
        index={index}
        isAdmin={isAdmin}
        isSelected={isSelected(key)}
        isExpanded={isExp}
        isDragOver={isDragOver}
        hasChildren={hasChildren}
        onToggleSelect={toggleSelect}
        onToggleExpand={toggleExpand}
        onItemClick={onItemClick}
        onChangeType={onChangeType}
      >
        {/* Render children only if expanded */}
        {isExp && (
          <>
            {childContainers.map((child, idx) => renderNode(child, child.type, idx))}
            {childQuizzes.map((child, idx) => renderNode(child, 'quiz', childContainers.length + idx))}
          </>
        )}
      </ExplorerNode>
    );
  }, [expandedContainers, dragOverContainer, indices, isAdmin, isSelected, toggleSelect, toggleExpand, onItemClick, onChangeType]);

  return (
    <DragDropContext onDragEnd={handleDragEnd} onDragUpdate={handleDragUpdate}>
      <div className="space-y-4">
        {/* Toolbar */}
        {isAdmin && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            {selectedKeys.size > 0 ? (
              <>
                <Badge className="bg-indigo-600">{selectedKeys.size} seleccionados</Badge>
                {onDeleteItems && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const items = Array.from(selectedKeys).map(key => {
                        const [type, id] = key.split('-');
                        return { type, id };
                      });
                      onDeleteItems(items);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <X className="w-4 h-4 mr-2" />
                  Limpiar selección
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500">Arrastra elementos para moverlos entre contenedores</p>
            )}
          </div>
        )}

        {/* Droppable root */}
        <Droppable droppableId="root" type="ITEM">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 min-h-[200px] p-4 rounded-lg border-2 border-dashed ${snapshot.isDraggingOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
                }`}
            >
              {indices.rootContainers.length === 0 && indices.rootQuizzes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No hay contenido en el nivel raíz</p>
                </div>
              ) : (
                <>
                  {indices.rootContainers.map((item, idx) => renderNode(item, item.type, idx))}
                  {indices.rootQuizzes.map((item, idx) => renderNode(item, 'quiz', indices.rootContainers.length + idx))}
                </>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}