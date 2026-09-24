import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import { ValidationStepResult } from '../../types';

interface ValidationPanelProps {
  validationRuns?: ValidationStepResult[];
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ validationRuns }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!validationRuns || validationRuns.length === 0) {
    return (
      <div className="bg-[#090d14] border border-slate-800 rounded-lg p-5 text-center text-xs text-slate-400">
        No validation executed for this run yet.
      </div>
    );
  }

  const allPassed = validationRuns.every((v) => v.passed);

  const copyOutput = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-[#090d14] border border-slate-800/80 rounded-lg overflow-hidden text-xs">
      {/* Panel status header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0c111a] border-b border-slate-800">
        <div className="flex items-center gap-2">
          {allPassed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="font-semibold text-slate-200">
            {allPassed ? 'All Validation Steps Passed' : 'Validation Failed'}
          </span>
          <span className="text-[11px] text-slate-400">({validationRuns.length} checks)</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Validation is authoritative</span>
        </div>
      </div>

      {/* Step items */}
      <div className="divide-y divide-slate-800/60">
        {validationRuns.map((run, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div key={idx} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {run.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase tracking-wider text-slate-200 text-[11px] font-mono">
                        {run.step}
                      </span>
                      <code className="text-[11px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {run.command}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{run.durationMs}ms</span>
                    <span className="text-slate-700">·</span>
                    <span className={run.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Exit: {run.exitCode}
                    </span>
                  </div>

                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="flex items-center gap-1 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{isExpanded ? 'Hide' : 'Logs'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Terminal Logs Output */}
              {isExpanded && (
                <div className="mt-3 bg-[#070a0f] border border-slate-800 rounded-lg p-3 font-mono text-[11px]">
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800 text-slate-400 text-[10px]">
                    <span>Command Output (stdout & stderr)</span>
                    <button
                      onClick={() => copyOutput(`${run.stdout}\n${run.stderr}`, idx)}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                    >
                      {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {run.stdout && (
                    <div className="text-slate-300 whitespace-pre-wrap mb-2">
                      {run.stdout}
                    </div>
                  )}
                  {run.stderr && (
                    <div className="text-rose-300 whitespace-pre-wrap">
                      {run.stderr}
                    </div>
                  )}
                  {!run.stdout && !run.stderr && (
                    <div className="text-slate-400 italic">No output logged.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
