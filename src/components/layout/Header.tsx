import React from 'react';
import {
  Terminal,
  FolderGit2,
  Plus,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Cpu,
  Key,
} from 'lucide-react';
import { User, Project } from '../../types';

interface HeaderProps {
  user: User | null;
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenCreateProject: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  healthInfo?: { hasGeminiKey: boolean; hasGithubToken: boolean };
  onToggleProjectsGrid?: () => void;
  isProjectsGridOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenCreateProject,
  onOpenAuth,
  onLogout,
  healthInfo,
  onToggleProjectsGrid,
  isProjectsGridOpen,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#090d14]/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        {/* Brand & Project Selector */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-sm tracking-tight">AI Project Orchestrator</span>
                <span className="text-[10px] tracking-wider uppercase font-mono text-slate-400">V1</span>
              </div>
            </div>
          </div>

          {user && projects.length > 0 && (
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="text-slate-600">/</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => onSelectProject(e.target.value)}
                  className="bg-slate-900/90 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {onToggleProjectsGrid && (
                <button
                  onClick={onToggleProjectsGrid}
                  className={`ml-1 px-2 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isProjectsGridOpen
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700 bg-slate-900/60'
                  }`}
                  title="View all project cards"
                >
                  <span>Cards</span>
                  <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400">
                    {projects.length}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Key status indicator */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5" title={healthInfo?.hasGeminiKey ? 'Gemini API active' : 'Gemini Key configured via env'}>
              <span className={`w-1.5 h-1.5 rounded-full ${healthInfo?.hasGeminiKey ? 'bg-emerald-400' : 'bg-emerald-400'}`} />
              <span className="font-mono text-[11px] text-slate-400">Gemini 3.8 Flash</span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-slate-400">Isolated Workspace</span>
            </div>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCreateProject}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-[11px] font-medium">
                    {user.name ? user.name.slice(0, 1).toUpperCase() : user.email.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
                    {user.name || user.email.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
