import React, { useState } from 'react';
import {
  X,
  FileCode,
  Copy,
  Check,
  HardDrive,
  Code2,
  ExternalLink,
  PlusCircle,
  FolderOpen,
} from 'lucide-react';

interface FileInspectorModalProps {
  filePath: string | null;
  onClose: () => void;
  onTargetFileInPlan?: (filePath: string) => void;
  fileStats?: {
    size?: number;
    lines?: number;
    sizeFormatted?: string;
    category?: string;
  };
}

export const FileInspectorModal: React.FC<FileInspectorModalProps> = ({
  filePath,
  onClose,
  onTargetFileInPlan,
  fileStats,
}) => {
  const [copied, setCopied] = useState(false);

  if (!filePath) return null;

  const fileName = filePath.split('/').pop() || filePath;
  const directory = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '.';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(filePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTargetTask = () => {
    if (onTargetFileInPlan) {
      onTargetFileInPlan(filePath);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0e1422] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-[#090d14]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">{fileName}</h3>
              <p className="text-[11px] font-mono text-slate-400 truncate max-w-sm">{directory}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* File Quick Specs */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#090d14] p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-mono block mb-1">Path</span>
              <span className="text-slate-200 font-mono text-[11px] truncate block" title={filePath}>
                {filePath}
              </span>
            </div>
            <div className="bg-[#090d14] p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-mono block mb-1">Estimated LOC</span>
              <span className="text-indigo-400 font-mono text-sm font-semibold">
                {fileStats?.lines ? `${fileStats.lines} lines` : 'Mapped'}
              </span>
            </div>
            <div className="bg-[#090d14] p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-mono block mb-1">Category</span>
              <span className="text-emerald-400 font-medium capitalize">
                {fileStats?.category || 'Source Code'}
              </span>
            </div>
          </div>

          {/* Code Reference Card */}
          <div className="bg-[#090d14] rounded-xl border border-slate-800 p-4 font-mono text-[11px] space-y-2">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/60">
              <span className="flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Workspace Virtual Path</span>
              </span>
              <button
                onClick={handleCopyPath}
                className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[10px]">{copied ? 'Copied!' : 'Copy Path'}</span>
              </button>
            </div>
            <p className="text-slate-300 bg-[#0b0f17] p-2.5 rounded border border-slate-800/60 break-all select-all">
              {filePath}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              onClick={handleCopyPath}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Path Copied to Clipboard' : 'Copy Relative Path'}</span>
            </button>
            {onTargetFileInPlan && (
              <button
                onClick={handleCreateTargetTask}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-900/30 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Plan Task For This File</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
