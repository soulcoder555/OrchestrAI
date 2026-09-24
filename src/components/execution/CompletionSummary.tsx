import React from 'react';
import { CheckCircle2, GitCommit, GitBranch, ArrowRight, ShieldCheck } from 'lucide-react';
import { Project, Task, CommitRecord } from '../../types';

interface CompletionSummaryProps {
  project: Project;
  tasks: Task[];
  commits: CommitRecord[];
}

export const CompletionSummary: React.FC<CompletionSummaryProps> = ({ project, tasks, commits }) => {
  return (
    <div className="bg-[#0e1717] border border-emerald-500/30 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100">Project Workflow Completed Successfully</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              VERIFIED
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            All {tasks.length} ordered tasks have been sequentially executed, validated against unit tests, syntax, and type checks, human-approved, and committed to working branch <code className="text-emerald-300 font-mono">{project.activeBranch || 'ai/orchestrator-execution'}</code>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-emerald-900/30 text-xs">
            <div className="bg-[#070e0e] p-3 rounded-lg border border-emerald-900/40">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Tasks Implemented</span>
              <span className="text-slate-100 font-bold font-mono text-sm">{tasks.length} / {tasks.length}</span>
            </div>
            <div className="bg-[#070e0e] p-3 rounded-lg border border-emerald-900/40">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Git Commits Created</span>
              <span className="text-slate-100 font-bold font-mono text-sm">{commits.length} commits</span>
            </div>
            <div className="bg-[#070e0e] p-3 rounded-lg border border-emerald-900/40">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Target Branch</span>
              <span className="text-emerald-300 font-mono text-xs">{project.activeBranch || 'ai/orchestrator-execution'}</span>
            </div>
          </div>

          {/* Commits List */}
          {commits.length > 0 && (
            <div className="mt-4 pt-3 border-t border-emerald-900/30">
              <span className="text-xs font-semibold text-slate-200 block mb-2">Commit Log</span>
              <div className="space-y-1.5 font-mono text-xs">
                {commits.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 p-2 bg-[#070e0e] border border-emerald-950 rounded">
                    <GitCommit className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-indigo-400 font-semibold">{c.commitHash}</span>
                    <span className="text-slate-300 truncate">{c.message}</span>
                    <span className="text-slate-500 text-[11px] ml-auto shrink-0">
                      {new Date(c.committedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-emerald-900/30 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Production branch <code className="text-slate-300">{project.defaultBranch || 'main'}</code> protected from direct modification.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
