import React, { useState } from 'react';
import { X, FolderGit2, Sparkles, Github, Layers, ArrowRight } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, repoOption: { isDemo: boolean; repoUrl?: string; githubToken?: string }) => Promise<void>;
  isLoading: boolean;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading,
}) => {
  const [name, setName] = useState('Payment Gateway Integration');
  const [description, setDescription] = useState('Add tokenized checkout and webhook signature verification.');
  const [repoType, setRepoType] = useState<'demo' | 'github'>('demo');
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    if (repoType === 'github' && !repoUrl.trim()) {
      setError('GitHub repository URL or owner/repo is required');
      return;
    }

    setError(null);
    try {
      await onCreate(name.trim(), description.trim(), {
        isDemo: repoType === 'demo',
        repoUrl: repoType === 'github' ? repoUrl.trim() : undefined,
        githubToken: githubToken.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#0e1420] border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-100">Create New Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auth Service"
              required
              className="w-full bg-[#090d14] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief overview of the codebase and purpose"
              className="w-full bg-[#090d14] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2">Repository Workspace</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRepoType('demo')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  repoType === 'demo'
                    ? 'bg-indigo-950/30 border-indigo-500/50 text-slate-100'
                    : 'bg-[#090d14] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-indigo-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant Demo</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Pre-seeded TypeScript microservice with test suite.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRepoType('github')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  repoType === 'github'
                    ? 'bg-indigo-950/30 border-indigo-500/50 text-slate-100'
                    : 'bg-[#090d14] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repo</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Connect public or private repository URL.
                </p>
              </button>
            </div>
          </div>

          {repoType === 'github' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">GitHub Repo URL or owner/repo</label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/facebook/react or vercel/next.js"
                  className="w-full bg-[#090d14] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">GitHub PAT Token (Optional for private repos)</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-[#090d14] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Creating...' : 'Create Project'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
