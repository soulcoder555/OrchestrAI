import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  CheckCircle,
  Edit2,
  Save,
  X,
  ListOrdered,
  AlertCircle,
  GripVertical,
  LayoutList,
  Kanban as KanbanIcon,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { Task } from '../../types';
import { KanbanBoard } from './KanbanBoard';

interface PlanEditorProps {
  tasks: Task[];
  initialGoal: string | null;
  onGeneratePlan: (goal: string) => Promise<void>;
  onUpdateTasks: (tasks: Partial<Task>[]) => Promise<void>;
  onApprovePlan: () => Promise<void>;
  isGenerating: boolean;
  projectStatus: string;
  onSelectTask?: (task: Task) => void;
  selectedTaskId?: string | null;
}

const SAMPLE_GOALS = [
  'Add secure refresh token rotation to the authentication system.',
  'Implement rate limiting and token bucket algorithm for API protection.',
  'Add token revocation blacklist with expiration cleanup in storage.',
];

export const PlanEditor: React.FC<PlanEditorProps> = ({
  tasks,
  initialGoal,
  onGeneratePlan,
  onUpdateTasks,
  onApprovePlan,
  isGenerating,
  projectStatus,
  onSelectTask,
  selectedTaskId,
}) => {
  const [goal, setGoal] = useState(initialGoal || '');
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag & Drop reorder state for list view
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync with prop changes if not currently editing
  React.useEffect(() => {
    if (!editingId) {
      setLocalTasks(tasks);
    }
  }, [tasks, editingId]);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      setError('Please enter a software goal first.');
      return;
    }
    setError(null);
    try {
      await onGeneratePlan(goal.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan.');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= localTasks.length) return;

    const updated = [...localTasks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    // Update order indices
    const normalized = updated.map((t, i) => ({ ...t, orderIndex: i + 1 }));
    setLocalTasks(normalized);

    try {
      await onUpdateTasks(normalized);
    } catch (e: any) {
      setError('Failed to reorder tasks');
    }
  };

  // Drag & Drop handlers for List View
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropTargetIndex: number) => {
    e.preventDefault();
    const sourceIndex = draggedIndex;
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (sourceIndex === null || sourceIndex === dropTargetIndex) return;

    const updated = [...localTasks];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(dropTargetIndex, 0, moved);

    const normalized = updated.map((t, i) => ({ ...t, orderIndex: i + 1 }));
    setLocalTasks(normalized);

    try {
      await onUpdateTasks(normalized);
    } catch (err) {
      setError('Failed to update task order');
    }
  };

  const handleDelete = async (id: string) => {
    const updated = localTasks.filter((t) => t.id !== id).map((t, i) => ({ ...t, orderIndex: i + 1 }));
    setLocalTasks(updated);
    try {
      await onUpdateTasks(updated);
    } catch (e: any) {
      setError('Failed to delete task');
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const updated = localTasks.map((t) =>
      t.id === editingId ? { ...t, title: editTitle, description: editDesc } : t
    );
    setLocalTasks(updated);
    setEditingId(null);

    try {
      await onUpdateTasks(updated);
    } catch (e: any) {
      setError('Failed to save task update');
    }
  };

  const handleAddTask = async () => {
    const newTask: Task = {
      id: `new-${Date.now()}`,
      projectId: tasks[0]?.projectId || '',
      orderIndex: localTasks.length + 1,
      title: 'New implementation task',
      description: 'Describe the file changes, implementation steps, and verification criteria.',
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    const updated = [...localTasks, newTask];
    setLocalTasks(updated);
    setEditingId(newTask.id);
    setEditTitle(newTask.title);
    setEditDesc(newTask.description);
  };

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    try {
      await onApprovePlan();
    } catch (err: any) {
      setError(err.message || 'Failed to approve plan.');
    } finally {
      setIsApproving(false);
    }
  };

  // Filter tasks for list view
  const filteredTasks = localTasks.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="bg-[#0e1422] border border-slate-800/80 rounded-2xl p-5 mb-6 shadow-xl transition-all duration-200">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <ListOrdered className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">Implementation Plan & Tasks</h2>
              <span className="text-[11px] text-slate-500">·</span>
              <span className="text-[11px] font-mono text-slate-400">
                {localTasks.length} {localTasks.length === 1 ? 'task' : 'tasks'} planned
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review, reorder with drag & drop, or toggle Kanban board view before execution.
            </p>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Dual View Mode Switcher */}
          <div className="flex items-center p-1 bg-[#090d14] border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              title="Sequential List View (Drag to Reorder)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Moveable Kanban Board View"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>

          <button
            onClick={handleAddTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090d14] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Task</span>
          </button>

          {localTasks.length > 0 && (
            <button
              onClick={handleApprove}
              disabled={isApproving || localTasks.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isApproving ? 'Approving...' : 'Approve Plan'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Goal Input Card */}
      <div className="mt-4 p-4 bg-[#090d14] border border-slate-800/80 rounded-xl">
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Software Implementation Goal
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe your implementation goal in natural language (e.g. Add secure refresh token rotation to auth)..."
          rows={2}
          className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        {/* Suggestion tags (Clickable) */}
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          <span className="text-[11px] text-slate-400">Suggestions:</span>
          {SAMPLE_GOALS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setGoal(sample)}
              className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors underline decoration-slate-700 underline-offset-2 cursor-pointer"
            >
              {sample.slice(0, 45)}...
            </button>
          ))}
        </div>

        <div className="mt-3.5 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !goal.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>
              {isGenerating
                ? 'Generating Structured Plan...'
                : localTasks.length > 0
                ? 'Regenerate Plan'
                : 'Generate Plan'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Tasks Display: Kanban Board OR Moveable List */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={localTasks}
          onSelectTask={(task) => onSelectTask && onSelectTask(task)}
          selectedTaskId={selectedTaskId || null}
          onUpdateTasks={onUpdateTasks}
          onEditTask={handleStartEdit}
          onDeleteTask={handleDelete}
        />
      ) : (
        <div className="mt-5 space-y-3">
          {/* Filter Bar & Drag Hint */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-slate-500 text-[11px] mr-1">Filter:</span>
              {[
                { id: 'ALL', label: 'All Tasks', count: localTasks.length },
                { id: 'PENDING', label: 'Pending', count: localTasks.filter((t) => t.status === 'PENDING').length },
                { id: 'RUNNING', label: 'In Progress', count: localTasks.filter((t) => t.status === 'RUNNING').length },
                { id: 'AWAITING_APPROVAL', label: 'Needs Review', count: localTasks.filter((t) => t.status === 'AWAITING_APPROVAL').length },
                { id: 'COMPLETED', label: 'Done', count: localTasks.filter((t) => t.status === 'COMPLETED').length },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                    statusFilter === f.id
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#090d14]'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
              Drag handle <GripVertical className="w-3 h-3 inline text-slate-500" /> to reorder tasks
            </span>
          </div>

          {/* Moveable Ordered Task List with Framer-Motion */}
          <motion.div layout className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task, index) => {
                const isEditing = editingId === task.id;
                const isSelected = selectedTaskId === task.id;
                const isDragging = draggedIndex === index;
                const isOver = dragOverIndex === index;

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.16 } }}
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 25,
                      delay: Math.min(index * 0.03, 0.25),
                    }}
                    whileHover={!isEditing ? { y: -1.5, transition: { duration: 0.15 } } : {}}
                    draggable={!isEditing}
                    onDragStart={(e) => handleDragStart(e as any, index)}
                    onDragOver={(e) => handleDragOver(e as any, index)}
                    onDrop={(e) => handleDrop(e as any, index)}
                    onClick={() => onSelectTask && onSelectTask(task)}
                    className={`group relative p-3.5 rounded-xl border transition-all duration-150 select-none ${
                      isDragging ? 'opacity-40 scale-95 border-dashed border-indigo-500' : ''
                    } ${
                      isOver && !isDragging
                        ? 'border-t-2 border-t-indigo-500 bg-indigo-950/20'
                        : ''
                    } ${
                      isSelected
                        ? 'border-indigo-500/90 bg-[#121929] shadow-lg ring-1 ring-indigo-500/20'
                        : task.status === 'COMPLETED'
                        ? 'bg-[#090e14] border-emerald-950/60 hover:border-emerald-800/40'
                        : task.status === 'BLOCKED'
                        ? 'bg-[#150a0a] border-rose-950/60 hover:border-rose-800/40'
                        : task.status === 'RUNNING'
                        ? 'bg-[#0d1224] border-indigo-900/60 hover:border-indigo-700/50'
                        : 'bg-[#090d14] border-slate-800/80 hover:border-slate-700/90 hover:bg-[#0c121d]'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-indigo-400 font-bold">
                            {task.orderIndex}.
                          </span>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 bg-[#0b0f17] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          rows={2}
                          className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* Moveable Drag Handle */}
                          <div
                            title="Drag to reorder task"
                            className="pt-0.5 text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-indigo-400 font-semibold">
                                Task #{task.orderIndex}
                              </span>
                              <span className="text-slate-600">·</span>
                              <h4 className="text-xs font-semibold text-slate-200 leading-snug">
                                {task.title}
                              </h4>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              {task.description}
                            </p>

                            {/* Status and Retry with Animated Transition */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2 font-mono">
                              <motion.div
                                key={task.status}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                className="flex items-center gap-1.5"
                              >
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${
                                    task.status === 'COMPLETED'
                                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                      : task.status === 'RUNNING'
                                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                      : task.status === 'AWAITING_APPROVAL'
                                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                      : task.status === 'BLOCKED'
                                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </motion.div>

                              {task.retryCount > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-400">
                                    Retries: {task.retryCount}/{task.maxRetries}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Clickable Action Controls */}
                        <div
                          className="flex items-center gap-1 shrink-0 pt-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleMove(index, 'up')}
                            disabled={index === 0}
                            title="Move task up"
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(index, 'down')}
                            disabled={index === filteredTasks.length - 1}
                            title="Move task down"
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStartEdit(task)}
                            title="Edit task details"
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            title="Delete task"
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

            {filteredTasks.length === 0 && (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No tasks match the active filter.</p>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  Show all tasks
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
