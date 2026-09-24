import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/storage.js';
import { AuthenticatedRequest, requireAuth } from '../auth/auth.js';
import { plannerService } from '../services/planner.js';

export const planRouter = Router();
planRouter.use(requireAuth);

const GoalInputSchema = z.object({
  goal: z.string().min(5).max(1000),
});

/**
 * Generate plan using single model call
 */
planRouter.post('/:projectId/plan', async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const project = db.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const parsed = GoalInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const tasks = await plannerService.planProject(projectId, parsed.data.goal);
    return res.json({ tasks });
  } catch (err: any) {
    console.error('Plan generation failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate plan' });
  }
});

/**
 * Human reviews/edits/reorders tasks
 */
planRouter.put('/:projectId/tasks', (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const project = db.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const { tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'At least one task is required in the plan.' });
    }

    const updatedTasks = db.setTasksForProject(
      projectId,
      tasks.map((t, idx) => ({
        orderIndex: idx + 1,
        title: t.title || `Task #${idx + 1}`,
        description: t.description || '',
        status: t.status || 'PENDING',
        retryCount: t.retryCount || 0,
        maxRetries: 2,
      }))
    );

    return res.json({ tasks: updatedTasks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update tasks' });
  }
});

/**
 * Human approves plan before execution starts
 */
planRouter.post('/:projectId/plan/approve', (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const project = db.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const tasks = db.listTasksByProjectId(projectId);
    if (tasks.length === 0) {
      return res.status(400).json({ error: 'Cannot approve an empty plan.' });
    }

    db.updateProject(projectId, { status: 'READY' });

    db.logActivity({
      projectId,
      type: 'PLAN_APPROVED',
      title: 'Plan approved by human reviewer',
      details: `${tasks.length} tasks ready for sequential execution.`,
    });

    return res.json({ success: true, project: db.getProjectById(projectId) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to approve plan' });
  }
});
