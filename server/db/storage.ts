import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Project,
  Repository,
  ProjectFact,
  Task,
  TaskRun,
  AiRun,
  ValidationRun,
  ArtifactChange,
  CommitRecord,
  ActivityEvent,
} from './types.js';

interface DatabaseSchema {
  users: User[];
  projects: Project[];
  repositories: Repository[];
  projectFacts: ProjectFact[];
  tasks: Task[];
  taskRuns: TaskRun[];
  aiRuns: AiRun[];
  validationRuns: ValidationRun[];
  artifacts: ArtifactChange[];
  commits: CommitRecord[];
  activities: ActivityEvent[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

class StorageService {
  private data: DatabaseSchema;
  private initialized = false;

  constructor() {
    this.data = {
      users: [],
      projects: [],
      repositories: [],
      projectFacts: [],
      tasks: [],
      taskRuns: [],
      aiRuns: [],
      validationRuns: [],
      artifacts: [],
      commits: [],
      activities: [],
    };
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          projects: parsed.projects || [],
          repositories: parsed.repositories || [],
          projectFacts: parsed.projectFacts || [],
          tasks: parsed.tasks || [],
          taskRuns: parsed.taskRuns || [],
          aiRuns: parsed.aiRuns || [],
          validationRuns: parsed.validationRuns || [],
          artifacts: parsed.artifacts || [],
          commits: parsed.commits || [],
          activities: parsed.activities || [],
        };
      } else {
        this.persist();
      }
      this.initialized = true;
    } catch (e) {
      console.error('Storage initialization failed, using in-memory store:', e);
      this.initialized = true;
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (e) {
      console.error('Failed to persist database to file:', e);
    }
  }

  // --- Users ---
  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(email: string, passwordHash: string, name?: string): User {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      name: name || null,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.persist();
    return user;
  }

  // --- Projects ---
  listProjectsByUserId(userId: string): Project[] {
    return this.data.projects
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getProjectById(id: string): Project | undefined {
    return this.data.projects.find((p) => p.id === id);
  }

  createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const project: Project = {
      ...projectData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.projects.push(project);
    this.persist();
    return project;
  }

  updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const index = this.data.projects.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    const updated = {
      ...this.data.projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.projects[index] = updated;
    this.persist();
    return updated;
  }

  deleteProject(id: string): boolean {
    const initialLen = this.data.projects.length;
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    if (this.data.projects.length !== initialLen) {
      this.data.repositories = this.data.repositories.filter((r) => r.projectId !== id);
      this.data.projectFacts = this.data.projectFacts.filter((f) => f.projectId !== id);
      this.data.tasks = this.data.tasks.filter((t) => t.projectId !== id);
      this.data.commits = this.data.commits.filter((c) => c.projectId !== id);
      this.data.activities = this.data.activities.filter((a) => a.projectId !== id);
      this.persist();
      return true;
    }
    return false;
  }

  // --- Repository ---
  getRepositoryByProjectId(projectId: string): Repository | undefined {
    return this.data.repositories.find((r) => r.projectId === projectId);
  }

  upsertRepository(repoData: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>): Repository {
    const existingIndex = this.data.repositories.findIndex((r) => r.projectId === repoData.projectId);
    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      const updated: Repository = {
        ...this.data.repositories[existingIndex],
        ...repoData,
        updatedAt: now,
      };
      this.data.repositories[existingIndex] = updated;
      this.persist();
      return updated;
    } else {
      const created: Repository = {
        ...repoData,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      this.data.repositories.push(created);
      this.persist();
      return created;
    }
  }

  // --- Project Facts ---
  getFactsByProjectId(projectId: string): ProjectFact[] {
    return this.data.projectFacts.filter((f) => f.projectId === projectId);
  }

  upsertFact(projectId: string, category: string, key: string, value: string): ProjectFact {
    const idx = this.data.projectFacts.findIndex((f) => f.projectId === projectId && f.key === key);
    const now = new Date().toISOString();
    if (idx >= 0) {
      this.data.projectFacts[idx] = {
        ...this.data.projectFacts[idx],
        category,
        value,
        updatedAt: now,
      };
      this.persist();
      return this.data.projectFacts[idx];
    } else {
      const fact: ProjectFact = {
        id: crypto.randomUUID(),
        projectId,
        category,
        key,
        value,
        createdAt: now,
        updatedAt: now,
      };
      this.data.projectFacts.push(fact);
      this.persist();
      return fact;
    }
  }

  // --- Tasks ---
  listTasksByProjectId(projectId: string): Task[] {
    return this.data.tasks
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  getTaskById(id: string): Task | undefined {
    return this.data.tasks.find((t) => t.id === id);
  }

  setTasksForProject(projectId: string, tasksData: Array<Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Task[] {
    // Remove existing tasks for this project
    this.data.tasks = this.data.tasks.filter((t) => t.projectId !== projectId);
    const now = new Date().toISOString();
    const createdTasks = tasksData.map((td, index) => ({
      ...td,
      id: crypto.randomUUID(),
      projectId,
      orderIndex: index + 1,
      retryCount: td.retryCount ?? 0,
      maxRetries: td.maxRetries ?? 2,
      createdAt: now,
      updatedAt: now,
    }));
    this.data.tasks.push(...createdTasks);
    this.persist();
    return createdTasks;
  }

  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    const updated = {
      ...this.data.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.tasks[idx] = updated;
    this.persist();
    return updated;
  }

  // --- Task Runs ---
  createTaskRun(taskId: string, attemptNumber: number, status: string): TaskRun {
    const run: TaskRun = {
      id: crypto.randomUUID(),
      taskId,
      attemptNumber,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.taskRuns.push(run);
    this.persist();
    return run;
  }

  updateTaskRun(id: string, updates: Partial<TaskRun>): TaskRun | undefined {
    const idx = this.data.taskRuns.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    const updated = {
      ...this.data.taskRuns[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.taskRuns[idx] = updated;
    this.persist();
    return updated;
  }

  getLatestTaskRun(taskId: string): TaskRun | undefined {
    const runs = this.data.taskRuns
      .filter((r) => r.taskId === taskId)
      .sort((a, b) => b.attemptNumber - a.attemptNumber);
    if (runs.length === 0) return undefined;
    const latest = { ...runs[0] };
    latest.aiRun = this.data.aiRuns.find((a) => a.taskRunId === latest.id);
    latest.validationRuns = this.data.validationRuns.filter((v) => v.taskRunId === latest.id);
    latest.artifacts = this.data.artifacts.filter((art) => art.taskRunId === latest.id);
    return latest;
  }

  listTaskRuns(taskId: string): TaskRun[] {
    return this.data.taskRuns
      .filter((r) => r.taskId === taskId)
      .sort((a, b) => a.attemptNumber - b.attemptNumber)
      .map((run) => ({
        ...run,
        aiRun: this.data.aiRuns.find((a) => a.taskRunId === run.id),
        validationRuns: this.data.validationRuns.filter((v) => v.taskRunId === run.id),
        artifacts: this.data.artifacts.filter((art) => art.taskRunId === run.id),
      }));
  }

  // --- AI Runs ---
  createAiRun(aiRunData: Omit<AiRun, 'id' | 'createdAt'>): AiRun {
    const aiRun: AiRun = {
      ...aiRunData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.data.aiRuns.push(aiRun);
    this.persist();
    return aiRun;
  }

  // --- Validation Runs ---
  createValidationRun(vData: Omit<ValidationRun, 'id' | 'createdAt'>): ValidationRun {
    const valRun: ValidationRun = {
      ...vData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.data.validationRuns.push(valRun);
    this.persist();
    return valRun;
  }

  // --- Artifacts / Changes ---
  createArtifacts(artifacts: Array<Omit<ArtifactChange, 'id' | 'createdAt'>>): ArtifactChange[] {
    const now = new Date().toISOString();
    const created = artifacts.map((art) => ({
      ...art,
      id: crypto.randomUUID(),
      createdAt: now,
    }));
    this.data.artifacts.push(...created);
    this.persist();
    return created;
  }

  // --- Commits ---
  createCommit(commitData: Omit<CommitRecord, 'id' | 'committedAt'>): CommitRecord {
    const commit: CommitRecord = {
      ...commitData,
      id: crypto.randomUUID(),
      committedAt: new Date().toISOString(),
    };
    this.data.commits.push(commit);
    this.persist();
    return commit;
  }

  listCommitsByProjectId(projectId: string): CommitRecord[] {
    return this.data.commits
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => new Date(b.committedAt).getTime() - new Date(a.committedAt).getTime());
  }

  // --- Activities ---
  logActivity(activityData: Omit<ActivityEvent, 'id' | 'timestamp'>): ActivityEvent {
    const act: ActivityEvent = {
      ...activityData,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.data.activities.push(act);
    this.persist();
    return act;
  }

  listActivities(projectId: string, limit = 50): ActivityEvent[] {
    return this.data.activities
      .filter((a) => a.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const db = new StorageService();
