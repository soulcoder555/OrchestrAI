import React, { useState } from 'react';
import { GitCommit, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { CommitRecord } from '../../types';

interface BranchCommitsCardProps {
  commits: CommitRecord[];
  activeBranch?: string | null;
}

export const BranchCommitsCard: React.FC<BranchCommitsCardProps> = ({ commits, activeBranch }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="bg-[#0e1422] border border-slate-800/80 rounded-2xl p-5 text-xs shadow-xl transition-all duration-200">
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <GitCommit className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-slate-200 text-xs">Branch Commits</span>
        </div>
        <span className="text-[11px] text-indigo-400 font-mono">
          {commits.length} {commits.length === 1 ? 'commit' : 'commits'}
        </span>
      </div>

      <div className="space-y-2 font-mono text-[11px]">
        {commits.map((c) => {
          const isCopied = copiedHash === c.commitHash;
          return (
            <div
              key={c.id}
              onClick={() => handleCopyHash(c.commitHash)}
              className="p-3 bg-[#090d14] rounded-xl border border-slate-800/80 hover:border-indigo-500/40 hover:bg-[#0c121e] transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-indigo-400 font-semibold group-hover:text-indigo-300">
                    {c.commitHash}
                  </span>
                  {isCopied ? (
                    <span className="flex items-center gap-0.5 text-emerald-400 text-[10px]">
                      <Check className="w-3 h-3" /> Copied!
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(c.committedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-slate-200 font-sans mt-1.5 text-xs line-clamp-2 leading-relaxed">
                {c.message}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                <span>{c.filesCount} file(s) changed</span>
                <span>·</span>
                <span className="text-emerald-400">Verified by Test Suite</span>
              </div>
            </div>
          );
        })}

        {commits.length === 0 && (
          <div className="p-6 text-slate-500 font-sans text-center border border-dashed border-slate-800/80 rounded-xl">
            <p className="text-xs text-slate-400">No commits on working branch yet.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Approve verified task diffs to commit automatically to isolated branch.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
