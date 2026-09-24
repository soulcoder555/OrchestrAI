import React, { useState } from 'react';
import {
  FileCode2,
  Cpu,
  Layers,
  CheckCircle,
  FileCheck,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Repository, RepoMap } from '../../types';

interface RepoScanCardProps {
  repository?: Repository;
  onScan: () => void;
  isScanning: boolean;
}

export const RepoScanCard: React.FC<RepoScanCardProps> = ({ repository, onScan, isScanning }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  let repoMap: RepoMap | null = null;
  if (repository?.repoMapJson) {
    try {
      repoMap = JSON.parse(repository.repoMapJson);
    } catch (e) {}
  }

  if (!repository) {
    return (
      <div className="bg-[#0e1420] border border-dashed border-slate-800 rounded-xl p-6 text-center">
        <p className="text-xs text-slate-400 mb-3">No repository attached to this project.</p>
        <button
          onClick={onScan}
          className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
        >
          Connect Repository
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0e1420] border border-slate-800/80 rounded-xl p-4.5 mb-6 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-slate-800/80 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">Repository Map</span>
              {repoMap?.scannedAt && (
                <span className="text-[11px] text-slate-400">
                  Scanned {new Date(repoMap.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[11px] text-slate-400 hidden sm:inline">Secrets Masked</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <span className="text-[11px]">{isExpanded ? 'Collapse' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {repoMap ? (
        <div className="mt-3">
          {/* Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/60 font-mono text-[11px]">
            <div className="bg-[#090d14] p-2.5 rounded-lg border border-slate-800/50">
              <span className="text-slate-400 block text-[10px] uppercase font-sans mb-0.5">Language</span>
              <span className="text-slate-200 font-semibold">{repoMap.detectedLanguage || 'TypeScript'}</span>
            </div>
            <div className="bg-[#090d14] p-2.5 rounded-lg border border-slate-800/50">
              <span className="text-slate-400 block text-[10px] uppercase font-sans mb-0.5">Framework</span>
              <span className="text-slate-200 font-semibold">{repoMap.detectedFramework || 'Node.js'}</span>
            </div>
            <div className="bg-[#090d14] p-2.5 rounded-lg border border-slate-800/50">
              <span className="text-slate-400 block text-[10px] uppercase font-sans mb-0.5">Files Mapped</span>
              <span className="text-slate-200 font-semibold">{repoMap.files.length} files</span>
            </div>
            <div className="bg-[#090d14] p-2.5 rounded-lg border border-slate-800/50">
              <span className="text-slate-400 block text-[10px] uppercase font-sans mb-0.5">Validation Scripts</span>
              <span className="text-indigo-300 font-semibold">
                {Object.keys(repoMap.availableScripts || {}).length} detected
              </span>
            </div>
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-3 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block font-sans text-xs mb-1">Detected Validation Commands</span>
                <div className="bg-[#090d14] p-2 rounded-lg border border-slate-800/60 space-y-1">
                  {Object.entries(repoMap.availableScripts || {}).map(([key, cmd]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-indigo-400 uppercase w-20">{key}:</span>
                      <span className="text-slate-300">{cmd}</span>
                    </div>
                  ))}
                  {Object.keys(repoMap.availableScripts || {}).length === 0 && (
                    <span className="text-slate-400 font-sans">No scripts configured in package manifest.</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-sans text-xs mb-1">Entry Points & Tests</span>
                <div className="bg-[#090d14] p-2 rounded-lg border border-slate-800/60 text-slate-300 space-y-1">
                  <div>
                    <span className="text-slate-400">Entry: </span>
                    {repoMap.entryPoints.join(', ') || 'Auto-detected'}
                  </div>
                  <div>
                    <span className="text-slate-400">Tests: </span>
                    {repoMap.testLocations.join(', ') || 'test/ directory'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>Repository map not yet generated. Scan to index configuration and files.</span>
          <button
            onClick={onScan}
            disabled={isScanning}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors"
          >
            {isScanning ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      )}
    </div>
  );
};
