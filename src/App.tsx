import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './services/api';
import {
  User,
  Project,
  ProjectDetails,
  Task,
  TaskRun,
  CommitRecord,
  ActivityEvent,
} from './types';
import { Header } from './components/layout/Header';
import { ProjectsGrid } from './components/project/ProjectsGrid';
import { ProjectHeader } from './components/project/ProjectHeader';
import { CodebaseStatsCard } from './components/project/CodebaseStatsCard';
import { RepoScanCard } from './components/project/RepoScanCard';
import { PlanEditor } from './components/plan/PlanEditor';
import { TaskExecutionView } from './components/execution/TaskExecutionView';
import { CompletionSummary } from './components/execution/CompletionSummary';
import { ActivityTimeline } from './components/execution/ActivityTimeline';
import { ProjectFactsCard } from './components/project/ProjectFactsCard';
import { BranchCommitsCard } from './components/project/BranchCommitsCard';
import { QuickActionBar } from './components/project/QuickActionBar';
import { CreateProjectModal } from './components/project/CreateProjectModal';
import { AuthModal } from './components/auth/AuthModal';
import {
  GitCommit,
  GitBranch,
  Layers,
  Sparkles,
  RefreshCw,
  FolderGit2,
  Terminal,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskRuns, setTaskRuns] = useState<TaskRun[]>([]);
  const [healthInfo, setHealthInfo] = useState<{ hasGeminiKey: boolean; hasGithubToken: boolean } | undefined>();

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isExecutingTask, setIsExecutingTask] = useState(false);
  const [isApprovingTask, setIsApprovingTask] = useState(false);
  const [isValidatingSuite, setIsValidatingSuite] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProjectsGridOpen, setIsProjectsGridOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Initial Auth Check & Auto Demo Login
  useEffect(() => {
    async function initAuth() {
      try {
        const health = await api.checkHealth();
        setHealthInfo(health);

        const me = await api.getMe();
        setUser(me.user);
      } catch (err) {
        // If not authenticated, attempt automatic demo login
        try {
          const res = await api.login('developer@orchestrator.local', 'orchestrator123');
          setUser(res.user);
        } catch (demoErr) {
          // Stay logged out
        }
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  // Fetch Projects list when user changes
  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setSelectedProjectId(null);
      setProjectDetails(null);
      return;
    }
    try {
      const res = await api.listProjects();
      setProjects(res.projects);
      if (res.projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res.projects[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
    }
  }, [user, selectedProjectId]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Fetch Project Details when selectedProjectId changes
  const refreshProjectDetails = useCallback(async () => {
    if (!selectedProjectId) {
      setProjectDetails(null);
      return;
    }
    try {
      const details = await api.getProject(selectedProjectId);
      setProjectDetails(details);

      // Auto-select current active or first incomplete task
      if (details.tasks.length > 0) {
        const activeTask =
          details.tasks.find((t) => t.status === 'RUNNING' || t.status === 'AWAITING_APPROVAL' || t.status === 'BLOCKED') ||
          details.tasks.find((t) => t.status === 'PENDING') ||
          details.tasks[0];

        setSelectedTaskId(activeTask.id);
      }
    } catch (err: any) {
      console.error('Failed to load project details:', err);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    refreshProjectDetails();
  }, [refreshProjectDetails]);

  // Fetch Task Runs when selectedTaskId changes
  useEffect(() => {
    if (!selectedTaskId) {
      setTaskRuns([]);
      return;
    }
    async function loadRuns() {
      try {
        const res = await api.getTaskRuns(selectedTaskId!);
        setTaskRuns(res.runs);
      } catch (err) {
        console.error('Failed to load task runs:', err);
      }
    }
    loadRuns();
  }, [selectedTaskId]);

  // Handlers
  const handleScanRepo = async () => {
    if (!selectedProjectId) return;
    setIsScanning(true);
    setErrorBanner(null);
    try {
      await api.scanRepository(selectedProjectId);
      await refreshProjectDetails();
    } catch (err: any) {
      setErrorBanner(err.message || 'Repo scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleGeneratePlan = async (goal: string) => {
    if (!selectedProjectId) return;
    setIsGeneratingPlan(true);
    setErrorBanner(null);
    try {
      await api.generatePlan(selectedProjectId, goal);
      await refreshProjectDetails();
    } catch (err: any) {
      setErrorBanner(err.message || 'Plan generation failed');
      throw err;
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleUpdateTasks = async (tasks: Partial<Task>[]) => {
    if (!selectedProjectId) return;
    try {
      await api.updateTasks(selectedProjectId, tasks);
      await refreshProjectDetails();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to update tasks');
      throw err;
    }
  };

  const handleApprovePlan = async () => {
    if (!selectedProjectId) return;
    try {
      await api.approvePlan(selectedProjectId);
      await refreshProjectDetails();
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to approve plan');
      throw err;
    }
  };

  const handleExecuteTask = async (taskId: string) => {
    setIsExecutingTask(true);
    setErrorBanner(null);
    try {
      const res = await api.executeTask(taskId);
      await refreshProjectDetails();
      const runs = await api.getTaskRuns(taskId);
      setTaskRuns(runs.runs);
    } catch (err: any) {
      setErrorBanner(err.message || 'Task execution error');
    } finally {
      setIsExecutingTask(false);
    }
  };

  const handleApproveTask = async (taskId: string, commitMessage?: string) => {
    setIsApprovingTask(true);
    setErrorBanner(null);
    try {
      const res = await api.approveTask(taskId, commitMessage);
      await refreshProjectDetails();

      // If next task exists, select it
      if (res.approvalResult?.nextTask) {
        setSelectedTaskId(res.approvalResult.nextTask.id);
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Task approval failed');
    } finally {
      setIsApprovingTask(false);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      await api.rejectTask(taskId);
      await refreshProjectDetails();
    } catch (err: any) {
      setErrorBanner(err.message || 'Task rejection failed');
    }
  };

  const handleFinalValidate = async () => {
    if (!selectedProjectId) return;
    setIsValidatingSuite(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/final-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api.getToken()}`,
        },
      });
      await refreshProjectDetails();
    } catch (err: any) {
      setErrorBanner(err.message || 'Final validation failed');
    } finally {
      setIsValidatingSuite(false);
    }
  };

  const handleCreateProject = async (
    name: string,
    description: string,
    repoOption: { isDemo: boolean; repoUrl?: string; githubToken?: string }
  ) => {
    const { project } = await api.createProject(name, description);
    await api.connectRepository(project.id, repoOption);
    await api.scanRepository(project.id);
    await refreshProjects();
    setSelectedProjectId(project.id);
  };

  const handleAddFact = async (category: string, key: string, value: string) => {
    if (!selectedProjectId) return;
    await fetch(`/api/projects/${selectedProjectId}/facts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${api.getToken()}`,
      },
      body: JSON.stringify({ category, key, value }),
    });
    await refreshProjectDetails();
  };

  const handleExecuteNextTask = async () => {
    if (!projectDetails) return;
    const next = projectDetails.tasks.find((t) => t.status === 'PENDING');
    if (next) {
      setSelectedTaskId(next.id);
      await handleExecuteTask(next.id);
    }
  };

  const handleAddNewTask = async () => {
    if (!projectDetails) return;
    const newTask: Task = {
      id: `new-${Date.now()}`,
      projectId: projectDetails.project.id,
      orderIndex: projectDetails.tasks.length + 1,
      title: 'New implementation task',
      description: 'Describe task scope, file changes, and verification requirements.',
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    await handleUpdateTasks([...projectDetails.tasks, newTask]);
  };

  const handleTargetFile = async (filePath: string) => {
    if (!projectDetails) return;
    const fileName = filePath.split('/').pop() || filePath;
    const newTask: Task = {
      id: `target-${Date.now()}`,
      projectId: projectDetails.project.id,
      orderIndex: projectDetails.tasks.length + 1,
      title: `Enhance & test ${fileName}`,
      description: `Target file ${filePath}. Ensure comprehensive unit verification and type safety.`,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString(),
    };
    await handleUpdateTasks([...projectDetails.tasks, newTask]);
  };

  const selectedTask = projectDetails?.tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      <Header
        user={user}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setIsProjectsGridOpen(false);
        }}
        onOpenCreateProject={() => setIsCreateModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={async () => {
          await api.logout();
          setUser(null);
        }}
        healthInfo={healthInfo}
        onToggleProjectsGrid={() => setIsProjectsGridOpen((prev) => !prev)}
        isProjectsGridOpen={isProjectsGridOpen}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {errorBanner && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center justify-between text-rose-300 text-xs">
            <span>{errorBanner}</span>
            <button onClick={() => setErrorBanner(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isProjectsGridOpen ? (
            <motion.div
              key="projects-grid-modal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProjectsGrid
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={(id) => {
                  setSelectedProjectId(id);
                  setIsProjectsGridOpen(false);
                }}
                onOpenCreateProject={() => setIsCreateModalOpen(true)}
                onClose={() => setIsProjectsGridOpen(false)}
              />
            </motion.div>
          ) : projectDetails ? (
            <motion.div
              key={projectDetails.project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Project Header */}
              <ProjectHeader
                project={projectDetails.project}
                repository={projectDetails.repository}
                tasks={projectDetails.tasks}
                onScanRepo={handleScanRepo}
                onOpenPlan={() => {}}
                onFinalValidate={handleFinalValidate}
                isScanning={isScanning}
                isValidating={isValidatingSuite}
              />

              {/* Quick Action Control Bar */}
              <QuickActionBar
                tasks={projectDetails.tasks}
                onExecuteNextTask={handleExecuteNextTask}
                onScanRepo={handleScanRepo}
                onAddNewTask={handleAddNewTask}
                isExecuting={isExecutingTask}
                isScanning={isScanning}
                activeBranch={projectDetails.project.activeBranch}
              />

              {/* Grid Layout: Main Orchestration Stage & Technical Inspector */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 8 cols: Main Execution Stage */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Codebase Size, Files, and Language Distribution Statistics */}
                  <CodebaseStatsCard
                    repository={projectDetails.repository}
                    onScan={handleScanRepo}
                    isScanning={isScanning}
                    onTargetFile={handleTargetFile}
                  />

                  {/* Repo Scan Summary Card */}
                  <RepoScanCard
                    repository={projectDetails.repository}
                    onScan={handleScanRepo}
                    isScanning={isScanning}
                  />

                  {/* Project Completion Banner */}
                  {projectDetails.project.status === 'COMPLETED' && (
                    <CompletionSummary
                      project={projectDetails.project}
                      tasks={projectDetails.tasks}
                      commits={projectDetails.commits}
                    />
                  )}

                  {/* Implementation Plan Review / Generator with Framer-Motion */}
                  <PlanEditor
                    tasks={projectDetails.tasks}
                    initialGoal={projectDetails.project.goal}
                    onGeneratePlan={handleGeneratePlan}
                    onUpdateTasks={handleUpdateTasks}
                    onApprovePlan={handleApprovePlan}
                    isGenerating={isGeneratingPlan}
                    projectStatus={projectDetails.project.status}
                    onSelectTask={(t) => setSelectedTaskId(t.id)}
                    selectedTaskId={selectedTaskId}
                  />

                  {/* Sequential Task Execution & Diff Review View */}
                  {selectedTask && (
                    <TaskExecutionView
                      task={selectedTask}
                      allTasks={projectDetails.tasks}
                      taskRuns={taskRuns}
                      onExecute={handleExecuteTask}
                      onApprove={handleApproveTask}
                      onReject={handleRejectTask}
                      onSelectTask={(t) => setSelectedTaskId(t.id)}
                      isExecuting={isExecutingTask}
                      isApproving={isApprovingTask}
                    />
                  )}
                </div>

                {/* Right 4 cols: Architecture & Orchestration Audit Trail */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Project Facts / Architecture */}
                  <ProjectFactsCard
                    facts={projectDetails.facts}
                    onAddFact={handleAddFact}
                  />

                  {/* Git Commits on Working Branch */}
                  <BranchCommitsCard
                    commits={projectDetails.commits}
                    activeBranch={projectDetails.project.activeBranch}
                  />

                  {/* Activity Timeline */}
                  <ActivityTimeline activities={projectDetails.activities} />
                </div>
              </div>
            </motion.div>
          ) : projects.length > 0 ? (
            /* If no project selected yet but projects exist, show animated projects grid */
            <motion.div
              key="projects-list-overview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <ProjectsGrid
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={(id) => {
                  setSelectedProjectId(id);
                }}
                onOpenCreateProject={() => setIsCreateModalOpen(true)}
              />
            </motion.div>
          ) : (
            /* Empty / No Project View */
            <motion.div
              key="no-project-empty"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-20 text-center max-w-md mx-auto"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-100">No Project Selected</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Create a new project or connect a repository to start the automated orchestration workflow.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Create Project
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
        isLoading={false}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          refreshProjects();
        }}
      />
    </div>
  );
}
