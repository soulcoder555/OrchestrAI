import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GripVertical,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Task } from '../../types';

interface KanbanBoardProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  selectedTaskId: string | null;
  onUpdateTasks: (tasks: Partial<Task>[]) => Promise<void>;
  onExecuteTask?: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

type ColumnId = 'PENDING' | 'RUNNING' | 'AWAITING_APPROVAL' | 'COMPLETED';

interface ColumnDef {
  id: ColumnId;
  label: string;
  sublabel: string;
  color: string;
  borderColor: string;
  bgBadge: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'PENDING',
    label: 'Planning & Backlog',
    sublabel: 'Ready for execution',
    color: 'text-slate-300',
    borderColor: 'border-slate-800',
    bgBadge: 'bg-slate-800/80 text-slate-300',
  },
  {
    id: 'RUNNING',
    label: 'In Progress',
    sublabel: 'Active AI agent run',
    color: 'text-indigo-400',
    borderColor: 'border-indigo-900/50',
    bgBadge: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  },
  {
    id: 'AWAITING_APPROVAL',
    label: 'Review & Approval',
    sublabel: 'Validation passed',
    color: 'text-amber-400',
    borderColor: 'border-amber-900/50',
    bgBadge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  {
    id: 'COMPLETED',
    label: 'Completed & Committed',
    sublabel: 'Branch up to date',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-900/50',
    bgBadge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onSelectTask,
  selectedTaskId,
  onUpdateTasks,
  onExecuteTask,
  onEditTask,
  onDeleteTask,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);

  // Group tasks by column
  const getTasksForColumn = (columnId: ColumnId) => {
    return tasks
      .filter((t) => {
        if (columnId === 'COMPLETED') {
          return t.status === 'COMPLETED' || t.status === 'BLOCKED';
        }
        return t.status === columnId;
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: ColumnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverColumn(null);

    if (!taskId) return;

    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove || taskToMove.status === targetColumnId) return;

    // Update the task status
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, status: targetColumnId };
      }
      return t;
    });

    try {
      await onUpdateTasks(updatedTasks);
    } catch (err) {
      console.error('Failed to move task status:', err);
    }
  };

  const handleQuickMove = async (task: Task, direction: 'next' | 'prev') => {
    const stageOrder: ColumnId[] = ['PENDING', 'RUNNING', 'AWAITING_APPROVAL', 'COMPLETED'];
    const currentIdx = stageOrder.indexOf(task.status as ColumnId);
    if (currentIdx === -1) return;

    const targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (targetIdx < 0 || targetIdx >= stageOrder.length) return;

    const nextStatus = stageOrder[targetIdx];
    const updated = tasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t));

    try {
      await onUpdateTasks(updated);
    } catch (err) {
      console.error('Failed to quick move task:', err);
    }
  };

  return (
    <div className="mt-4">
      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
        {COLUMNS.map((col) => {
          const colTasks = getTasksForColumn(col.id);
          const isDragOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-xl border transition-all duration-150 min-h-[360px] p-3 ${
                isDragOver
                  ? 'bg-indigo-950/20 border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-lg'
                  : 'bg-[#090d14]/70 border-slate-800/80 hover:border-slate-800'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${col.bgBadge}`}>
                    {colTasks.length}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 hidden sm:inline">{col.sublabel}</span>
              </div>

              {/* Tasks in column with Framer-Motion Transitions */}
              <div className="space-y-2.5 flex-1">
                <AnimatePresence mode="popLayout">
                  {colTasks.map((task, taskIdx) => {
                    const isSelected = selectedTaskId === task.id;
                    const isDragging = draggedTaskId === task.id;

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.14 } }}
                        transition={{
                          type: 'spring',
                          stiffness: 350,
                          damping: 25,
                          delay: Math.min(taskIdx * 0.02, 0.15),
                        }}
                        whileHover={{ y: -2, transition: { duration: 0.15 } }}
                        draggable
                        onDragStart={(e) => handleDragStart(e as any, task.id)}
                        onClick={() => onSelectTask(task)}
                        className={`group relative rounded-lg p-3 border transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
                          isDragging ? 'opacity-40 scale-95 border-dashed border-indigo-500' : ''
                        } ${
                          isSelected
                            ? 'bg-[#121929] border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                            : task.status === 'COMPLETED'
                            ? 'bg-[#0a1215] border-emerald-950/60 hover:border-emerald-800/50'
                            : task.status === 'BLOCKED'
                            ? 'bg-[#150a0a] border-rose-950/60 hover:border-rose-800/50'
                            : task.status === 'RUNNING'
                            ? 'bg-[#0d1224] border-indigo-900/60 hover:border-indigo-700/50'
                            : 'bg-[#0b0f17] border-slate-800/80 hover:border-slate-700 hover:bg-[#0e1422]'
                        }`}
                      >
                        {/* Top row: Drag handle, Order, Status */}
                        <div className="flex items-center justify-between text-slate-400 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                            <span className="font-mono text-[11px] font-bold text-slate-300">
                              #{task.orderIndex}
                            </span>
                          </div>

                          <motion.div
                            key={task.status}
                            initial={{ scale: 0.75, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-1"
                          >
                            {task.status === 'COMPLETED' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            {task.status === 'BLOCKED' && (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            {task.status === 'RUNNING' && (
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            )}
                            {task.status === 'PENDING' && (
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </motion.div>
                        </div>

                        {/* Task Title */}
                        <h4 className="text-xs font-semibold text-slate-200 leading-snug line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Task Description */}
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>

                        {/* Footer Actions & Move Handles */}
                        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                            {task.retryCount > 0 && (
                              <span className="text-amber-400">
                                Retry {task.retryCount}/{task.maxRetries}
                              </span>
                            )}
                            {task.retryCount === 0 && (
                              <span>Task {task.orderIndex} of {tasks.length}</span>
                            )}
                          </div>

                          {/* Quick Move Buttons */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {col.id !== 'PENDING' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickMove(task, 'prev');
                                }}
                                title="Move back to previous stage"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {col.id !== 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickMove(task, 'next');
                                }}
                                title="Move forward to next stage"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {onEditTask && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTask(task);
                                }}
                                title="Edit task details"
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {colTasks.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-800/70 rounded-lg p-4 text-center">
                    <p className="text-[11px] text-slate-500 font-medium">No tasks here</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Drag a task card here to move</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
