import React from 'react';
import {
  Play,
  RotateCw,
  Plus,
  GitBranch,
  Shield,
  Layers,
  Sparkles,
  Command,
} from 'lucide-react';
import { Task } from '../../types';

interface QuickActionBarProps {
  tasks: Task[];
  onExecuteNextTask: () => void;
  onScanRepo: () => void;
  onAddNewTask: () => void;
  isExecuting: boolean;
  isScanning: boolean;
  activeBranch?: string | null;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  tasks,
  onExecuteNextTask,
  onScanRepo,
  onAddNewTask,
  isExecuting,
  isScanning,
  activeBranch,
}) => {
  const nextPending = tasks.find((t) => t.status === 'PENDING');
  const runningTask = tasks.find((t) => t.status === 'RUNNING');
  const reviewTask = tasks.find((t) => t.status === 'AWAITING_APPROVAL');

  return (
    <div className="bg-[#0e1422]/90 backdrop-blur border border-slate-800/80 rounded-2xl p-3 mb-6 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left: Next Action Context */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
          <Command className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Orchestration Control</span>
          <span className="text-slate-600">·</span>
          {runningTask ? (
            <span className="text-indigo-400 font-mono text-[11px] animate-pulse">
              Running #{runningTask.orderIndex}: {runningTask.title.slice(0, 30)}...
            </span>
          ) : reviewTask ? (
            <span className="text-amber-400 font-mono text-[11px]">
              Awaiting Approval: #{reviewTask.orderIndex}
            </span>
          ) : nextPending ? (
            <span className="text-slate-400 font-mono text-[11px]">
              Next: #{nextPending.orderIndex} {nextPending.title.slice(0, 28)}...
            </span>
          ) : (
            <span className="text-emerald-400 font-mono text-[11px]">
              All scheduled tasks completed
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick Action Buttons */}
      <div className="flex items-center gap-2">
        {nextPending && (
          <button
            onClick={onExecuteNextTask}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-950/40 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Run Next Task (#{nextPending.orderIndex})</span>
          </button>
        )}

        <button
          onClick={onAddNewTask}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#090d14] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Add Step</span>
        </button>

        <button
          onClick={onScanRepo}
          disabled={isScanning}
          title="Refresh workspace analysis"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#090d14] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden sm:inline">Scan</span>
        </button>
      </div>
    </div>
  );
};
