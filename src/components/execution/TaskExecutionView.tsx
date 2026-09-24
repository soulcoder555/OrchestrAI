import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  GitCommit,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronLeft,
  Shield,
  FileCode,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';
import { Task, TaskRun, ArtifactChange, ValidationStepResult } from '../../types';
import { DiffViewer } from './DiffViewer';
import { ValidationPanel } from './ValidationPanel';

interface TaskExecutionViewProps {
  task: Task;
  allTasks: Task[];
  taskRuns: TaskRun[];
  onExecute: (taskId: string) => Promise<void>;
  onApprove: (taskId: string, commitMessage?: string) => Promise<void>;
  onReject: (taskId: string) => Promise<void>;
  onSelectTask: (task: Task) => void;
  isExecuting: boolean;
  isApproving: boolean;
}

export const TaskExecutionView: React.FC<TaskExecutionViewProps> = ({
  task,
  allTasks,
  taskRuns,
  onExecute,
  onApprove,
  onReject,
  onSelectTask,
  isExecuting,
  isApproving,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'diff' | 'validation' | 'reasoning'>('diff');
  const [copiedTaskTitle, setCopiedTaskTitle] = useState(false);

  const latestRun = taskRuns[taskRuns.length - 1];
  const artifacts = latestRun?.artifacts || [];
  const validationRuns = latestRun?.validationRuns || [];
  const aiRun = latestRun?.aiRun;

  let parsedAiOutput: any = null;
  if (aiRun?.parsedOutputJson) {
    try {
      parsedAiOutput = JSON.parse(aiRun.parsedOutputJson);
    } catch (e) {}
  }

  const isAwaitingApproval = task.status === 'AWAITING_APPROVAL';
  const isBlocked = task.status === 'BLOCKED';
  const isCompleted = task.status === 'COMPLETED';

  // Navigation between tasks
  const currentIndex = allTasks.findIndex((t) => t.id === task.id);
  const prevTask = currentIndex > 0 ? allTasks[currentIndex - 1] : null;
  const nextTask = currentIndex < allTasks.length - 1 ? allTasks[currentIndex + 1] : null;

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(task.title);
    setCopiedTaskTitle(true);
    setTimeout(() => setCopiedTaskTitle(false), 2000);
  };

  return (
    <div className="bg-[#0e1422] border border-slate-800/80 rounded-2xl p-5 mb-6 shadow-xl transition-all duration-200">
      {/* Task Selector Stepper / Tabs */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pr-2">
          {allTasks.map((t) => {
            const isCurrent = t.id === task.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTask(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono transition-all shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/30'
                    : t.status === 'COMPLETED'
                    ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-900/40 hover:border-emerald-700/60'
                    : t.status === 'BLOCKED'
                    ? 'bg-rose-950/30 text-rose-300 border border-rose-900/40 hover:border-rose-700/60'
                    : 'bg-[#090d14] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>#{t.orderIndex}</span>
                <span className="font-sans truncate max-w-[120px]">{t.title}</span>
                {t.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                {t.status === 'BLOCKED' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
              </button>
            );
          })}
        </div>

        {/* Quick Prev / Next Navigator */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 pl-2">
          <button
            onClick={() => prevTask && onSelectTask(prevTask)}
            disabled={!prevTask}
            title="Previous task"
            className="p-1.5 rounded-lg bg-[#090d14] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => nextTask && onSelectTask(nextTask)}
            disabled={!nextTask}
            title="Next task"
            className="p-1.5 rounded-lg bg-[#090d14] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-indigo-400 font-semibold">
              Task #{task.orderIndex} of {allTasks.length}
            </span>
            <span className="text-slate-600">·</span>
            <h3 className="text-base font-bold text-slate-100">{task.title}</h3>
            <button
              onClick={handleCopyTitle}
              title="Copy task title"
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              {copiedTaskTitle ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{task.description}</p>
        </div>

        {/* Task Status & Action */}
        <div className="flex items-center gap-2.5">
          {task.retryCount > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono">
              Attempt {task.retryCount + 1} of {task.maxRetries + 1}
            </div>
          )}

          {!isCompleted && !isAwaitingApproval && (
            <button
              onClick={() => onExecute(task.id)}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-900/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Workflow...</span>
                </>
              ) : isBlocked ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Task</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Execute Task</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* BLOCKED Warning Banner */}
      {isBlocked && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-300">Task Execution Blocked</h4>
              <p className="text-xs text-rose-200/80 mt-0.5 leading-relaxed">
                Task reached maximum automated retry attempts (3 total attempts). The workflow paused safely to avoid looping. Please inspect the raw validation errors below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED Banner */}
      {isCompleted && (
        <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Task completed, verified with unit checks, and committed to isolated working branch.</span>
          </div>
        </div>
      )}

      {/* Human Approval Required Bar */}
      {isAwaitingApproval && (
        <div className="mt-4 p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-100">Validation Passed — Human Approval Required</h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Review the proposed code diff and validation checks below before committing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onReject(task.id)}
                className="px-3.5 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs rounded-xl transition-all cursor-pointer"
              >
                Reject Changes
              </button>
              <button
                onClick={() => onApprove(task.id, commitMessage || undefined)}
                disabled={isApproving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>{isApproving ? 'Committing...' : 'Approve & Commit'}</span>
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-indigo-900/40 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">Commit message:</span>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder={`feat(orchestrator): ${task.title} [Task #${task.orderIndex}]`}
              className="flex-1 bg-[#090d14] border border-indigo-950 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      )}

      {/* Tabs for Results: Diff, Validation, Reasoning */}
      {latestRun && (
        <div className="mt-5">
          <div className="flex items-center gap-1 border-b border-slate-800/80 mb-3 text-xs">
            <button
              onClick={() => setActiveTab('diff')}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'diff'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Code Diff ({artifacts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'validation'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Validation Results ({validationRuns.length})</span>
            </button>
            {parsedAiOutput?.reasoningSummary && (
              <button
                onClick={() => setActiveTab('reasoning')}
                className={`flex items-center gap-1.5 px-3 py-2 font-medium border-b-2 transition-all cursor-pointer ${
                  activeTab === 'reasoning'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Reasoning</span>
              </button>
            )}
          </div>

          {activeTab === 'diff' && <DiffViewer artifacts={artifacts} />}
          {activeTab === 'validation' && <ValidationPanel validationRuns={validationRuns} />}
          {activeTab === 'reasoning' && parsedAiOutput && (
            <div className="bg-[#090d14] border border-slate-800 rounded-xl p-4 text-xs space-y-3">
              <div>
                <span className="text-slate-400 block font-mono text-[11px] mb-1">Reasoning Summary</span>
                <p className="text-slate-200 leading-relaxed">{parsedAiOutput.reasoningSummary}</p>
              </div>
              {parsedAiOutput.testsExpected?.length > 0 && (
                <div>
                  <span className="text-slate-400 block font-mono text-[11px] mb-1">Expected Tests</span>
                  <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                    {parsedAiOutput.testsExpected.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
