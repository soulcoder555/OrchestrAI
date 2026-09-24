export type ProjectStatus =
  | 'CREATED'
  | 'SCANNING'
  | 'READY'
  | 'PLANNING'
  | 'EXECUTING'
  | 'BLOCKED'
  | 'COMPLETED';

export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'VALIDATING'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'COMPLETED';

export type ChangeType = 'CREATE' | 'MODIFY' | 'DELETE';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  status: ProjectStatus;
  userId: string;
  activeBranch: string | null;
  defaultBranch: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LanguageStat {
  name: string;
  filesCount: number;
  linesCount: number;
  bytes: number;
  percentage: number;
  color: string;
}

export interface CategoryStat {
  files: number;
  bytes: number;
  lines: number;
}

export interface ExtensionStat {
  extension: string;
  count: number;
  bytes: number;
}

export interface CodebaseStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  totalLines: number;
  avgFileSizeFormatted: string;
  primaryLanguage: string;
  languages: LanguageStat[];
  categories: {
    source: CategoryStat;
    tests: CategoryStat;
    config: CategoryStat;
    documentation: CategoryStat;
  };
  fileExtensions: ExtensionStat[];
}

export interface RepoMap {
  files: string[];
  importantConfigs: string[];
  manifest?: {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  detectedFramework: string;
  detectedLanguage: string;
  entryPoints: string[];
  testLocations: string[];
  availableScripts: {
    lint?: string;
    typecheck?: string;
    test?: string;
    build?: string;
  };
  readmeSummary?: string;
  stats?: CodebaseStats;
  scannedAt: string;
}

export interface Repository {
  id: string;
  projectId: string;
  owner: string;
  repoName: string;
  githubUrl: string;
  defaultBranch: string;
  workingBranch: string;
  isLocalDemo: boolean;
  repoMapJson: string | null;
  scannedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFact {
  id: string;
  projectId: string;
  category: string;
  key: string;
  value: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  orderIndex: number;
  title: string;
  description: string;
  status: TaskStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}

export interface ValidationStepResult {
  step: 'lint' | 'typecheck' | 'test' | 'final_check';
  command: string;
  exitCode: number;
  passed: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ArtifactChange {
  id: string;
  filePath: string;
  changeType: ChangeType;
  diffPatch: string;
  originalText: string | null;
  modifiedText: string | null;
  explanation: string | null;
}

export interface TaskRun {
  id: string;
  taskId: string;
  attemptNumber: number;
  status: string;
  createdAt: string;
  aiRun?: {
    model: string;
    promptSummary: string;
    rawOutput: string;
    parsedOutputJson: string;
    error: string | null;
  };
  validationRuns?: ValidationStepResult[];
  artifacts?: ArtifactChange[];
}

export interface CommitRecord {
  id: string;
  projectId: string;
  taskId: string | null;
  commitHash: string;
  branch: string;
  message: string;
  filesCount: number;
  filesList: string[];
  committedAt: string;
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  taskId?: string;
  type:
    | 'REPO_SCANNED'
    | 'PLAN_GENERATED'
    | 'PLAN_APPROVED'
    | 'TASK_STARTED'
    | 'AI_CODE_GENERATED'
    | 'VALIDATION_STARTED'
    | 'VALIDATION_PASSED'
    | 'VALIDATION_FAILED'
    | 'RETRY_ATTEMPT'
    | 'TASK_APPROVED'
    | 'TASK_REJECTED'
    | 'TASK_BLOCKED'
    | 'COMMIT_CREATED'
    | 'PROJECT_COMPLETED';
  title: string;
  details?: string;
  timestamp: string;
}

export interface ProjectDetails {
  project: Project;
  repository?: Repository;
  tasks: Task[];
  facts: ProjectFact[];
  commits: CommitRecord[];
  activities: ActivityEvent[];
}
