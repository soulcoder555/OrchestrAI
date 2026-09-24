import { Router } from 'express';
import { db } from '../db/storage.js';
import { AuthenticatedRequest, requireAuth } from '../auth/auth.js';
import { executorService } from '../services/executor.js';
import { WorkspaceManager } from '../services/workspace-manager.js';
import { Validator } from '../services/validator.js';

export const executionRouter = Router();
executionRouter.use(requireAuth);

/**
 * Execute a specific task in sequential workflow
 */
executionRouter.post('/tasks/:taskId/execute', async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId } = req.params;
    const task = db.getTaskById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const project = db.getProjectById(task.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    // Execute task through Orchestrator executor loop
    const result = await executorService.executeTask(taskId);
    const updatedTask = db.getTaskById(taskId);
    const latestRun = db.getLatestTaskRun(taskId);

    return res.json({
      result,
      task: updatedTask,
      taskRun: latestRun,
    });
  } catch (err: any) {
    console.error('Task execution endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Task execution failed' });
  }
});

/**
 * Human Approval: Approve & Commit
 */
executionRouter.post('/tasks/:taskId/approve', async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId } = req.params;
    const { commitMessage } = req.body;
    const task = db.getTaskById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const project = db.getProjectById(task.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const approvalResult = await executorService.approveAndCommitTask(taskId, commitMessage);
    const updatedTask = db.getTaskById(taskId);
    const updatedProject = db.getProjectById(task.projectId);

    return res.json({
      success: true,
      approvalResult,
      task: updatedTask,
      project: updatedProject,
    });
  } catch (err: any) {
    console.error('Task approval error:', err);
    return res.status(500).json({ error: err.message || 'Task approval failed' });
  }
});

/**
 * Human Rejection
 */
executionRouter.post('/tasks/:taskId/reject', async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId } = req.params;
    const { feedback } = req.body;
    const task = db.getTaskById(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const project = db.getProjectById(task.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const updatedTask = await executorService.rejectTask(taskId, feedback);
    return res.json({ task: updatedTask });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Task rejection failed' });
  }
});

/**
 * Get all runs, attempts, diffs, and validation outputs for a task
 */
executionRouter.get('/tasks/:taskId/runs', (req: AuthenticatedRequest, res) => {
  const { taskId } = req.params;
  const task = db.getTaskById(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const runs = db.listTaskRuns(taskId);
  return res.json({ runs });
});

/**
 * Get project commits
 */
executionRouter.get('/projects/:projectId/commits', (req: AuthenticatedRequest, res) => {
  const { projectId } = req.params;
  const project = db.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

  const commits = db.listCommitsByProjectId(projectId);
  return res.json({ commits });
});

/**
 * Final validation run
 */
executionRouter.post('/projects/:projectId/final-validate', async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const project = db.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const wsPath = WorkspaceManager.getWorkspacePath(projectId);
    const suite = await Validator.validateWorkspace(wsPath);

    return res.json({ suite });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Final validation failed' });
  }
});
