import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/storage.js';
import { AuthenticatedRequest, requireAuth } from '../auth/auth.js';
import { WorkspaceManager } from '../services/workspace-manager.js';

export const projectRouter = Router();

const CreateProjectSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
});

projectRouter.use(requireAuth);

projectRouter.get('/', (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const projects = db.listProjectsByUserId(userId);
  return res.json({ projects });
});

projectRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = CreateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const userId = req.user!.id;
    const project = db.createProject({
      name: parsed.data.name,
      description: parsed.data.description || null,
      goal: null,
      status: 'CREATED',
      userId,
      activeBranch: 'ai/orchestrator-execution',
      defaultBranch: 'main',
    });

    // Initialize workspace
    await WorkspaceManager.initWorkspace(project.id, 'main', 'ai/orchestrator-execution');

    db.logActivity({
      projectId: project.id,
      type: 'REPO_SCANNED',
      title: `Project created: ${project.name}`,
    });

    return res.status(201).json({ project });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create project' });
  }
});

projectRouter.get('/:id', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (project.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const repository = db.getRepositoryByProjectId(id);
  const tasks = db.listTasksByProjectId(id);
  const facts = db.getFactsByProjectId(id);
  const commits = db.listCommitsByProjectId(id);
  const activities = db.listActivities(id, 40);

  return res.json({
    project,
    repository,
    tasks,
    facts,
    commits,
    activities,
  });
});

projectRouter.patch('/:id', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const project = db.getProjectById(id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

  const { name, description, goal, status } = req.body;
  const updated = db.updateProject(id, {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(goal !== undefined && { goal }),
    ...(status !== undefined && { status }),
  });

  return res.json({ project: updated });
});

projectRouter.delete('/:id', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const project = db.getProjectById(id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

  db.deleteProject(id);
  return res.json({ success: true });
});

projectRouter.post('/:id/facts', (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const project = db.getProjectById(id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

  const { category, key, value } = req.body;
  if (!category || !key || !value) {
    return res.status(400).json({ error: 'category, key, and value are required' });
  }

  const fact = db.upsertFact(id, category, key, value);
  return res.json({ fact });
});
