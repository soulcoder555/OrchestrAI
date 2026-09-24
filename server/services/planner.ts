import { db } from '../db/storage.js';
import { defaultAIProvider } from './gemini-provider.js';
import { AIProvider, PlanOutput } from './ai-provider.interface.js';
import { Task } from '../db/types.js';

export class PlannerService {
  private aiProvider: AIProvider;

  constructor(aiProvider: AIProvider = defaultAIProvider) {
    this.aiProvider = aiProvider;
  }

  async planProject(projectId: string, userGoal: string): Promise<Task[]> {
    const project = db.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const repo = db.getRepositoryByProjectId(projectId);
    if (!repo || !repo.repoMapJson) {
      throw new Error('Repository map not found. Scan the repository first.');
    }

    const repoMap = JSON.parse(repo.repoMapJson);
    const facts = db.getFactsByProjectId(projectId);

    // Update project state
    db.updateProject(projectId, {
      goal: userGoal,
      status: 'PLANNING',
    });

    db.logActivity({
      projectId,
      type: 'PLAN_GENERATED',
      title: 'Planning project implementation',
      details: `User Goal: ${userGoal}`,
    });

    // Make ONE model call to generate the plan
    const planResult: PlanOutput = await this.aiProvider.generatePlan({
      goal: userGoal,
      repoMap,
      projectFacts: facts.map((f) => ({ category: f.category, key: f.key, value: f.value })),
    });

    // Save detected stack summary to facts if returned
    if (planResult.detectedStackSummary) {
      db.upsertFact(projectId, 'architecture', 'stack_summary', planResult.detectedStackSummary);
    }

    // Persist tasks in database
    const createdTasks = db.setTasksForProject(
      projectId,
      planResult.tasks.map((t, idx) => ({
        orderIndex: idx + 1,
        title: t.title,
        description: t.description,
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 2,
      }))
    );

    // Update project to READY state for human review
    db.updateProject(projectId, { status: 'READY' });

    db.logActivity({
      projectId,
      type: 'PLAN_GENERATED',
      title: `Plan created with ${createdTasks.length} tasks`,
      details: planResult.planSummary,
    });

    return createdTasks;
  }
}

export const plannerService = new PlannerService();
