import React, { useState } from 'react';
import {
  HardDrive,
  Files,
  Code2,
  Cpu,
  RefreshCw,
  FileCode,
  FileCheck2,
  Settings2,
  BookOpen,
  PieChart,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Repository, RepoMap, CodebaseStats, LanguageStat } from '../../types';
import { FileInspectorModal } from './FileInspectorModal';

interface CodebaseStatsCardProps {
  repository?: Repository;
  onScan: () => void;
  isScanning: boolean;
  onTargetFile?: (filePath: string) => void;
}

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Fallback generator if repository map was created before stats schema was introduced
function computeFallbackStats(repoMap: RepoMap): CodebaseStats {
  const files = repoMap.files || [];
  const totalFiles = files.length;
  let sourceFiles = 0;
  let testFiles = 0;
  let configFiles = 0;
  let docFiles = 0;

  const langCounts: Record<string, { count: number; color: string }> = {};

  for (const f of files) {
    const lower = f.toLowerCase();
    if (lower.includes('test') || lower.includes('spec')) {
      testFiles++;
      langCounts['JavaScript'] = langCounts['JavaScript'] || { count: 0, color: '#f7df1e' };
      langCounts['JavaScript'].count++;
    } else if (lower.endsWith('.ts') || lower.endsWith('.tsx')) {
      sourceFiles++;
      langCounts['TypeScript'] = langCounts['TypeScript'] || { count: 0, color: '#3178c6' };
      langCounts['TypeScript'].count++;
    } else if (lower.endsWith('.js') || lower.endsWith('.jsx')) {
      sourceFiles++;
      langCounts['JavaScript'] = langCounts['JavaScript'] || { count: 0, color: '#f7df1e' };
      langCounts['JavaScript'].count++;
    } else if (lower.endsWith('.json')) {
      configFiles++;
      langCounts['JSON'] = langCounts['JSON'] || { count: 0, color: '#cbcb41' };
      langCounts['JSON'].count++;
    } else if (lower.endsWith('.md')) {
      docFiles++;
      langCounts['Markdown'] = langCounts['Markdown'] || { count: 0, color: '#083fa1' };
      langCounts['Markdown'].count++;
    } else {
      configFiles++;
    }
  }

  const estBytes = totalFiles * 780;
  const languages: LanguageStat[] = Object.entries(langCounts).map(([name, data]) => ({
    name,
    filesCount: data.count,
    linesCount: data.count * 35,
    bytes: data.count * 780,
    percentage: totalFiles > 0 ? Number(((data.count / totalFiles) * 100).toFixed(1)) : 0,
    color: data.color,
  }));

  return {
    totalFiles,
    totalSizeBytes: estBytes,
    totalSizeFormatted: formatBytes(estBytes),
    totalLines: totalFiles * 35,
    avgFileSizeFormatted: formatBytes(780),
    primaryLanguage: repoMap.detectedLanguage || 'TypeScript',
    languages: languages.length > 0 ? languages : [{
      name: repoMap.detectedLanguage || 'TypeScript',
      filesCount: totalFiles,
      linesCount: totalFiles * 35,
      bytes: estBytes,
      percentage: 100,
      color: '#3178c6',
    }],
    categories: {
      source: { files: sourceFiles, bytes: sourceFiles * 900, lines: sourceFiles * 40 },
      tests: { files: testFiles, bytes: testFiles * 800, lines: testFiles * 35 },
      config: { files: configFiles, bytes: configFiles * 500, lines: configFiles * 25 },
      documentation: { files: docFiles, bytes: docFiles * 600, lines: docFiles * 20 },
    },
    fileExtensions: [
      { extension: '.ts', count: sourceFiles, bytes: sourceFiles * 900 },
      { extension: '.js', count: testFiles, bytes: testFiles * 800 },
      { extension: '.json', count: configFiles, bytes: configFiles * 500 },
      { extension: '.md', count: docFiles, bytes: docFiles * 600 },
    ],
  };
}

export const CodebaseStatsCard: React.FC<CodebaseStatsCardProps> = ({
  repository,
  onScan,
  isScanning,
  onTargetFile,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);
  const [selectedLangFilter, setSelectedLangFilter] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedFilePath, setInspectedFilePath] = useState<string | null>(null);

  if (!repository) {
    return null;
  }

  let repoMap: RepoMap | null = null;
  if (repository.repoMapJson) {
    try {
      repoMap = JSON.parse(repository.repoMapJson);
    } catch (e) {}
  }

  if (!repoMap) {
    return (
      <div className="bg-[#0e1422] border border-slate-800/80 rounded-2xl p-6 mb-6 text-xs shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Codebase Statistics</h3>
              <p className="text-xs text-slate-400 mt-0.5">Scan repository to calculate size, lines of code, and language distribution.</p>
            </div>
          </div>
          <button
            onClick={onScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Repository'}</span>
          </button>
        </div>
      </div>
    );
  }

  const stats: CodebaseStats = repoMap.stats || computeFallbackStats(repoMap);
  const allFiles = repoMap.files || [];

  // Filtered files based on interactive user selections
  const filteredFiles = allFiles.filter((file) => {
    if (searchQuery && !file.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategoryFilter) {
      const lower = file.toLowerCase();
      if (selectedCategoryFilter === 'tests' && !lower.includes('test') && !lower.includes('spec')) return false;
      if (selectedCategoryFilter === 'documentation' && !lower.endsWith('.md') && !lower.startsWith('docs/')) return false;
      if (selectedCategoryFilter === 'config' && !lower.endsWith('.json') && !lower.includes('config') && !lower.endsWith('.yml')) return false;
      if (selectedCategoryFilter === 'source' && (lower.includes('test') || lower.endsWith('.md') || lower.endsWith('.json'))) return false;
    }
    if (selectedLangFilter) {
      const lower = file.toLowerCase();
      if (selectedLangFilter === 'TypeScript' && !lower.endsWith('.ts') && !lower.endsWith('.tsx')) return false;
      if (selectedLangFilter === 'JavaScript' && !lower.endsWith('.js') && !lower.endsWith('.jsx')) return false;
      if (selectedLangFilter === 'JSON' && !lower.endsWith('.json')) return false;
      if (selectedLangFilter === 'Markdown' && !lower.endsWith('.md')) return false;
      if (selectedLangFilter === 'Python' && !lower.endsWith('.py')) return false;
      if (selectedLangFilter === 'Go' && !lower.endsWith('.go')) return false;
      if (selectedLangFilter === 'Rust' && !lower.endsWith('.rs')) return false;
    }
    return true;
  });

  return (
    <div className="bg-[#0e1422] border border-slate-800/80 rounded-2xl p-5 mb-6 shadow-xl transition-all duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <PieChart className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm tracking-tight">Codebase Statistics</h3>
              <span className="text-[11px] text-slate-500">·</span>
              <span className="text-[11px] font-mono text-emerald-400">
                Live Isolated Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any metric or language below to filter files and inspect architecture.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onScan}
            disabled={isScanning}
            title="Re-scan codebase to update metrics"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#090d14] border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isScanning ? 'Analyzing...' : 'Re-scan'}</span>
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white text-xs font-medium transition-all rounded-lg bg-[#090d14] border border-slate-800 hover:border-slate-700 cursor-pointer"
          >
            <span>{showAdvanced ? 'Hide Explorer' : 'Explore Files'}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid with 3D tactile lift */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        {/* Metric 1: Codebase Size */}
        <div
          onClick={() => setShowAdvanced(true)}
          className="group bg-[#090d14] border border-slate-800/80 rounded-xl p-3.5 hover:border-indigo-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Codebase Size</span>
            <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
            {stats.totalSizeFormatted}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>{stats.totalSizeBytes.toLocaleString()} B</span>
            <span>~{stats.avgFileSizeFormatted}/file</span>
          </div>
        </div>

        {/* Metric 2: Number of Files */}
        <div
          onClick={() => {
            setSelectedCategoryFilter(null);
            setSelectedLangFilter(null);
            setShowAdvanced(true);
          }}
          className="group bg-[#090d14] border border-slate-800/80 rounded-xl p-3.5 hover:border-blue-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Files</span>
            <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Files className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
            {stats.totalFiles} <span className="text-xs font-normal text-slate-400 font-sans">files</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {stats.categories.source.files} src · {stats.categories.tests.files} test · {stats.categories.config.files} cfg
          </div>
        </div>

        {/* Metric 3: Lines of Code */}
        <div
          onClick={() => setShowAdvanced(true)}
          className="group bg-[#090d14] border border-slate-800/80 rounded-xl p-3.5 hover:border-emerald-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Lines of Code</span>
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Code2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
            {stats.totalLines.toLocaleString()} <span className="text-xs font-normal text-slate-400 font-sans">lines</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>{stats.categories.source.lines} source</span>
            <span className="text-emerald-400/90">{stats.categories.tests.lines} tests</span>
          </div>
        </div>

        {/* Metric 4: Primary Language */}
        <div
          onClick={() => {
            setSelectedLangFilter(stats.primaryLanguage);
            setShowAdvanced(true);
          }}
          className="group bg-[#090d14] border border-slate-800/80 rounded-xl p-3.5 hover:border-purple-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Primary Language</span>
            <div className="p-1 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-100 truncate">
            {stats.primaryLanguage}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: stats.languages[0]?.color || '#3178c6' }}
            />
            <span className="font-mono text-indigo-300">
              {stats.languages[0]?.percentage || 100}% of codebase
            </span>
          </div>
        </div>
      </div>

      {/* Languages Distribution Bar with Clickable Filtering */}
      <div className="my-4 pt-3 border-t border-slate-800/60">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">Language Distribution</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 text-[11px]">Click a language to filter workspace files</span>
          </div>
          {selectedLangFilter && (
            <button
              onClick={() => setSelectedLangFilter(null)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
            >
              Clear Filter ({selectedLangFilter})
            </button>
          )}
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="w-full h-3.5 rounded-full bg-slate-800/90 overflow-hidden flex shadow-inner gap-0.5 p-0.5">
          {stats.languages.map((lang) => {
            const isHovered = hoveredLang === lang.name;
            const isSelected = selectedLangFilter === lang.name;
            return (
              <div
                key={lang.name}
                style={{
                  width: `${Math.max(lang.percentage, 3)}%`,
                  backgroundColor: lang.color,
                }}
                onMouseEnter={() => setHoveredLang(lang.name)}
                onMouseLeave={() => setHoveredLang(null)}
                onClick={() => {
                  setSelectedLangFilter(selectedLangFilter === lang.name ? null : lang.name);
                  setShowAdvanced(true);
                }}
                title={`${lang.name}: ${lang.percentage}% (${lang.filesCount} files) - Click to filter`}
                className={`h-full rounded-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-white scale-y-125 z-10'
                    : isHovered
                    ? 'brightness-125 scale-y-110 shadow-sm'
                    : 'opacity-90 hover:opacity-100'
                }`}
              />
            );
          })}
        </div>

        {/* Clickable Languages Badges */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs">
          {stats.languages.map((lang) => {
            const isSelected = selectedLangFilter === lang.name;
            return (
              <button
                key={lang.name}
                onClick={() => {
                  setSelectedLangFilter(isSelected ? null : lang.name);
                  setShowAdvanced(true);
                }}
                onMouseEnter={() => setHoveredLang(lang.name)}
                onMouseLeave={() => setHoveredLang(null)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 ring-1 ring-indigo-500/30'
                    : hoveredLang === lang.name
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-300 hover:bg-[#090d14] border border-transparent'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: lang.color }}
                />
                <span className="font-medium">{lang.name}</span>
                <span className="font-mono text-[11px] text-slate-400">{lang.percentage}%</span>
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                  ({lang.filesCount} {lang.filesCount === 1 ? 'file' : 'files'})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Explorer / Breakdown Section */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-4 text-xs animate-in fade-in duration-150">
          {/* Categorical Distribution Filter Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 font-semibold">Workspace Categories</span>
              {selectedCategoryFilter && (
                <button
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
                >
                  Reset Category
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-[11px]">
              {/* Source */}
              <button
                type="button"
                onClick={() =>
                  setSelectedCategoryFilter(selectedCategoryFilter === 'source' ? null : 'source')
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCategoryFilter === 'source'
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-[#090d14] border-slate-800/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-indigo-400 font-sans font-medium mb-1">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Source Code</span>
                </div>
                <div className="text-slate-200 font-bold text-sm">
                  {stats.categories.source.files} files
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  {formatBytes(stats.categories.source.bytes)} · {stats.categories.source.lines} LOC
                </div>
              </button>

              {/* Tests */}
              <button
                type="button"
                onClick={() =>
                  setSelectedCategoryFilter(selectedCategoryFilter === 'tests' ? null : 'tests')
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCategoryFilter === 'tests'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-[#090d14] border-slate-800/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-sans font-medium mb-1">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Test Suites</span>
                </div>
                <div className="text-slate-200 font-bold text-sm">
                  {stats.categories.tests.files} files
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  {formatBytes(stats.categories.tests.bytes)} · {stats.categories.tests.lines} LOC
                </div>
              </button>

              {/* Config */}
              <button
                type="button"
                onClick={() =>
                  setSelectedCategoryFilter(selectedCategoryFilter === 'config' ? null : 'config')
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCategoryFilter === 'config'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/30'
                    : 'bg-[#090d14] border-slate-800/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-sans font-medium mb-1">
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Config & Build</span>
                </div>
                <div className="text-slate-200 font-bold text-sm">
                  {stats.categories.config.files} files
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  {formatBytes(stats.categories.config.bytes)} · {stats.categories.config.lines} LOC
                </div>
              </button>

              {/* Documentation */}
              <button
                type="button"
                onClick={() =>
                  setSelectedCategoryFilter(
                    selectedCategoryFilter === 'documentation' ? null : 'documentation'
                  )
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCategoryFilter === 'documentation'
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-[#090d14] border-slate-800/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-blue-400 font-sans font-medium mb-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Documentation</span>
                </div>
                <div className="text-slate-200 font-bold text-sm">
                  {stats.categories.documentation.files} files
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  {formatBytes(stats.categories.documentation.bytes)} · {stats.categories.documentation.lines} LOC
                </div>
              </button>
            </div>
          </div>

          {/* Searchable Clickable File List */}
          <div className="bg-[#090d14] rounded-xl border border-slate-800/80 p-3.5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mapped files (e.g. auth, test, config)..."
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0 font-mono">
                <span>{filteredFiles.length} of {allFiles.length} files</span>
              </div>
            </div>

            {/* Clickable File Rows */}
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
              {filteredFiles.map((filePath) => {
                const ext = filePath.split('.').pop() || '';
                return (
                  <div
                    key={filePath}
                    onClick={() => setInspectedFilePath(filePath)}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#0b0f17] hover:bg-[#121826] border border-transparent hover:border-slate-700/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-slate-300 group-hover:text-white truncate">{filePath}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100">
                      <span className="text-[10px] text-slate-500 uppercase">.{ext}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                );
              })}

              {filteredFiles.length === 0 && (
                <div className="text-center py-6 text-slate-500 font-sans">
                  No files match the active filters or search query.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive File Inspector Modal */}
      {inspectedFilePath && (
        <FileInspectorModal
          filePath={inspectedFilePath}
          onClose={() => setInspectedFilePath(null)}
          onTargetFileInPlan={onTargetFile}
        />
      )}
    </div>
  );
};
