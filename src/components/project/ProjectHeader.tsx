import React, { useState } from 'react';
import {
  GitBranch,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { Project, Repository, Task } from '../../types';

interface ProjectHeaderProps {
  project: Project;
  repository?: Repository;
  tasks: Task[];
  onScanRepo: () => void;
  onOpenPlan: () => void;
  onFinalValidate: () => void;
  isScanning: boolean;
  isValidating: boolean;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  repository,
  tasks,
  onScanRepo,
  onOpenPlan,
  onFinalValidate,
  isScanning,
  isValidating,
}) => {
  const [copiedBranch, setCopiedBranch] = useState(false);
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const blockedCount = tasks.filter((t) => t.status === 'BLOCKED').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const branchName = project.activeBranch || 'ai/orchestrator-execution';

  const handleCopyBranch = () => {
    navigator.clipboard.writeText(branchName);
    setCopiedBranch(true);
    setTimeout(() => setCopiedBranch(false), 2000);
  };

  return (
    <div className="bg-[#0e1422] border border-slate-800/80 rounded-2xl p-5 mb-6 shadow-xl transition-all duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Project title & clean unboxed metadata */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">{project.name}</h1>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-emerald-400 font-medium uppercase tracking-wide">
              {project.status}
            </span>
          </div>

          {project.description && (
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{project.description}</p>
          )}

          {/* Clean Unboxed Metadata Row */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400 pt-1">
            {repository ? (
              <a
                href={repository.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-400 transition-colors"
              >
                <span className="font-mono text-xs">{repository.owner}/{repository.repoName}</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            ) : (
              <span className="text-amber-400">Isolated workspace</span>
            )}

            <span className="text-slate-700" aria-hidden="true">·</span>

            {/* Clickable Branch Isolation tag */}
            <button
              onClick={handleCopyBranch}
              title="Click to copy isolated branch name"
              className="flex items-center gap-1.5 font-mono text-xs text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer group"
            >
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              <span>{branchName}</span>
              {copiedBranch ? (
                <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
              ) : (
                <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
              )}
            </button>

            <span className="text-slate-700" aria-hidden="true">·</span>

            <div className="flex items-center gap-1 text-slate-400" title="Protected default branch">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Base: {project.defaultBranch || 'main'}</span>
            </div>
          </div>
        </div>

        {/* Right: Progress & Primary Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Progress metric */}
          {tasks.length > 0 && (
            <div className="bg-[#090d14] border border-slate-800 rounded-xl p-3 min-w-[170px] shadow-sm">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-400">Execution Progress</span>
                <span className="font-mono text-slate-200 font-semibold tabular-nums">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    blockedCount > 0 ? 'bg-rose-500' : progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 font-mono">
                <span>{completedCount}/{tasks.length} done</span>
                {blockedCount > 0 && <span className="text-rose-400">{blockedCount} blocked</span>}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onScanRepo}
              disabled={isScanning}
              title="Rescan repository files and configurations"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#090d14] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan Repo'}</span>
            </button>

            {tasks.length === 0 ? (
              <button
                onClick={onOpenPlan}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-900/30 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Plan Implementation</span>
              </button>
            ) : project.status === 'COMPLETED' ? (
              <button
                onClick={onFinalValidate}
                disabled={isValidating}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-medium transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isValidating ? 'Validating...' : 'Verify Suite'}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
