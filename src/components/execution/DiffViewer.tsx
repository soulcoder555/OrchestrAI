import React, { useState } from 'react';
import { FileCode, Plus, Minus, FileText, Check } from 'lucide-react';
import { ArtifactChange } from '../../types';

interface DiffViewerProps {
  artifacts: ArtifactChange[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ artifacts }) => {
  const [selectedFile, setSelectedFile] = useState<string>(artifacts[0]?.filePath || '');

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="bg-[#090d14] border border-slate-800 rounded-lg p-6 text-center text-xs text-slate-400">
        No code changes generated for this task yet.
      </div>
    );
  }

  const currentArtifact = artifacts.find((a) => a.filePath === selectedFile) || artifacts[0];

  const renderDiffLines = (diffPatch: string) => {
    const lines = diffPatch.split('\n');
    return (
      <div className="font-mono text-xs leading-relaxed overflow-x-auto select-text">
        {lines.map((line, idx) => {
          let bgClass = 'hover:bg-slate-900/40 text-slate-400';
          let indicator = ' ';
          let text = line;

          if (line.startsWith('---') || line.startsWith('+++')) {
            bgClass = 'bg-slate-900/80 text-slate-400 font-semibold';
          } else if (line.startsWith('@@')) {
            bgClass = 'bg-indigo-950/40 text-indigo-400 font-semibold py-0.5';
          } else if (line.startsWith('+')) {
            bgClass = 'bg-emerald-950/30 text-emerald-300';
            indicator = '+';
            text = line.slice(1);
          } else if (line.startsWith('-')) {
            bgClass = 'bg-rose-950/30 text-rose-300';
            indicator = '-';
            text = line.slice(1);
          }

          return (
            <div key={idx} className={`flex px-3 py-0.5 ${bgClass}`}>
              <span className="w-8 text-right select-none opacity-40 pr-3 text-[11px]">{idx + 1}</span>
              <span className="w-4 select-none font-bold opacity-75">{indicator}</span>
              <span className="flex-1 whitespace-pre font-mono">{text}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-[#090d14] border border-slate-800/80 rounded-lg overflow-hidden">
      {/* Tab bar for changed files */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#0c111a] border-b border-slate-800 overflow-x-auto text-xs">
        <span className="text-[11px] text-slate-400 mr-2 font-mono uppercase">Files:</span>
        {artifacts.map((art) => {
          const isSelected = art.filePath === currentArtifact.filePath;
          return (
            <button
              key={art.filePath}
              onClick={() => setSelectedFile(art.filePath)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors font-mono cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 text-slate-100 font-semibold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>{art.filePath}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded font-sans uppercase ${
                  art.changeType === 'CREATE'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : art.changeType === 'DELETE'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {art.changeType}
              </span>
            </button>
          );
        })}
      </div>

      {/* File explanation banner if available */}
      {currentArtifact.explanation && (
        <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/60 text-xs text-slate-400 flex items-center gap-2">
          <span className="font-semibold text-slate-300">Explanation:</span>
          <span>{currentArtifact.explanation}</span>
        </div>
      )}

      {/* Code diff view */}
      <div className="max-h-[450px] overflow-y-auto py-2">
        {renderDiffLines(currentArtifact.diffPatch)}
      </div>
    </div>
  );
};
