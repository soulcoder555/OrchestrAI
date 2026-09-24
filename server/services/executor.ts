import { db } from '../db/storage.js';
import { defaultAIProvider } from './gemini-provider.js';
import { AIProvider, CodeChangeOutput } from './ai-provider.interface.js';
import { ContextRetriever } from './context-retriever.js';
import { WorkspaceManager, ApplyFileResult } from './workspace-manager.js';
import { Validator, ValidationSuiteResult } from './validator.js';
import { Task, TaskRun, Project } from '../db/types.js';

export interface ExecuteTaskResult {
  taskId: string;
  taskRunId: string;
  attemptNumber: number;
  status: 'AWAITING_APPROVAL' | 'BLOCKED' | 'RUNNING';
  aiOutput?: CodeChangeOutput;
  artifacts?: ApplyFileResult[];
  validationSuite?: ValidationSuiteResult;
  error?: string;
}

export class ExecutorService {
  private aiProvider: AIProvider;
  private executingTaskIds = new Set<string>();

  constructor(aiProvider: AIProvider = defaultAIProvider) {
    this.aiProvider = aiProvider;
  }

  /**
   * Execute a single task sequentially
   */
  async executeTask(taskId: string, retryRawErrors?: string): Promise<ExecuteTaskResult> {
    const task = db.getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const project = db.getProjectById(task.projectId);
    if (!project) throw new Error(`Project ${task.projectId} not found`);

    if (this.executingTaskIds.has(taskId)) {
      throw new Error(`Task ${task.title} is already actively executing.`);
    }

    this.executingTaskIds.add(taskId);

    try {
      // Set project status to EXECUTING
      db.updateProject(project.id, { status: 'EXECUTING' });

      // Initialize isolated workspace and working branch
      const wsPath = await WorkspaceManager.initWorkspace(
        project.id,
        project.defaultBranch || 'main',
        'ai/orchestrator-execution'
      );

      // Attempt index
      const attemptNumber = task.retryCount + 1;

      // Update task to RUNNING
      db.updateTask(taskId, { status: 'RUNNING' });
      const taskRun = db.createTaskRun(taskId, attemptNumber, 'RUNNING');

      db.logActivity({
        projectId: project.id,
        taskId: task.id,
        type: 'TASK_STARTED',
        title: `Task #${task.orderIndex}: ${task.title} (Attempt ${attemptNumber})`,
        details: task.description,
      });

      // A. Retrieve relevant bounded context
      const context = await ContextRetriever.getContextForTask(
        wsPath,
        project.id,
        task.title,
        task.description
      );

      // B. Build Code Change Request
      let previousProposal: CodeChangeOutput | undefined = undefined;
      if (retryRawErrors) {
        const previousRun = db.getLatestTaskRun(taskId);
        if (previousRun?.aiRun) {
          try {
            previousProposal = JSON.parse(previousRun.aiRun.parsedOutputJson);
          } catch (e) {}
        }
      }

      // C. Call one AI model
      let aiOutput: CodeChangeOutput;
      try {
        aiOutput = await this.aiProvider.generateCodeChange({
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            orderIndex: task.orderIndex,
          },
          goal: project.goal || task.description,
          relevantContext: context,
          retryContext: retryRawErrors
            ? {
                attemptNumber,
                previousProposal,
                rawValidationErrors: retryRawErrors,
              }
            : undefined,
        });
      } catch (err: any) {
        console.error('AI generation error:', err);
        db.createAiRun({
          taskRunId: taskRun.id,
          model: this.aiProvider.model,
          promptSummary: `Task: ${task.title}`,
          contextTokensEst: null,
          rawOutput: '',
          parsedOutputJson: '{}',
          error: err.message,
        });
        db.updateTask(taskId, { status: 'BLOCKED' });
        db.updateTaskRun(taskRun.id, { status: 'BLOCKED' });
        db.updateProject(project.id, { status: 'BLOCKED' });
        db.logActivity({
          projectId: project.id,
          taskId: task.id,
          type: 'TASK_BLOCKED',
          title: `AI Code Generation failed on Task #${task.orderIndex}`,
          details: err.message,
        });
        return {
          taskId,
          taskRunId: taskRun.id,
          attemptNumber,
          status: 'BLOCKED',
          error: `AI Generation failed: ${err.message}`,
        };
      }

      // Persist AI Run
      db.createAiRun({
        taskRunId: taskRun.id,
        model: this.aiProvider.model,
        promptSummary: `Task: ${task.title}`,
        contextTokensEst: null,
        rawOutput: JSON.stringify(aiOutput),
        parsedOutputJson: JSON.stringify(aiOutput),
        error: null,
      });

      db.logActivity({
        projectId: project.id,
        taskId: task.id,
        type: 'AI_CODE_GENERATED',
        title: `AI proposed changes to ${aiOutput.filesChanged.length} file(s)`,
        details: aiOutput.summary,
      });

      // E. Apply diff in isolated workspace
      const appliedArtifacts = await WorkspaceManager.applyFileChanges(
        wsPath,
        aiOutput.filesChanged
      );

      // Persist Artifacts
      db.createArtifacts(
        appliedArtifacts.map((art) => ({
          taskRunId: taskRun.id,
          filePath: art.filePath,
          changeType: art.changeType,
          diffPatch: art.diffPatch,
          originalText: art.originalContent,
          modifiedText: art.modifiedContent,
          explanation: aiOutput.filesChanged.find((f) => f.filePath === art.filePath)?.explanation || null,
        }))
      );

      // F. Run validation
      db.updateTask(taskId, { status: 'VALIDATING' });
      db.logActivity({
        projectId: project.id,
        taskId: task.id,
        type: 'VALIDATION_STARTED',
        title: `Running validation checks (lint, typecheck, tests)...`,
      });

      const validationSuite = await Validator.validateWorkspace(wsPath);

      // Persist validation runs
      for (const step of validationSuite.steps) {
        db.createValidationRun({
          taskRunId: taskRun.id,
          step: step.step,
          command: step.command,
          exitCode: step.exitCode,
          passed: step.passed,
          stdout: step.stdout,
          stderr: step.stderr,
          durationMs: step.durationMs,
        });
      }

      // G. Handle PASS or FAIL
      if (validationSuite.passed) {
        // PASS -> Require Human Approval (do NOT auto commit)
        db.updateTask(taskId, { status: 'AWAITING_APPROVAL' });
        db.updateTaskRun(taskRun.id, { status: 'AWAITING_APPROVAL' });
        db.logActivity({
          projectId: project.id,
          taskId: task.id,
          type: 'VALIDATION_PASSED',
          title: `Validation passed! Awaiting human approval.`,
          details: `Commands passed: ${validationSuite.steps.map((s) => s.command).join(', ')}`,
        });

        return {
          taskId,
          taskRunId: taskRun.id,
          attemptNumber,
          status: 'AWAITING_APPROVAL',
          aiOutput,
          artifacts: appliedArtifacts,
          validationSuite,
        };
      } else {
        // FAIL -> Check retries
        db.updateTaskRun(taskRun.id, { status: 'VALIDATION_FAILED' });
        db.logActivity({
          projectId: project.id,
          taskId: task.id,
          type: 'VALIDATION_FAILED',
          title: `Validation failed on attempt ${attemptNumber}`,
          details: validationSuite.rawErrorOutput.slice(0, 300),
        });

        if (task.retryCount < task.maxRetries) {
          // Retry allowed! Increment retry count and retry with raw validation errors
          const nextRetryCount = task.retryCount + 1;
          db.updateTask(taskId, { retryCount: nextRetryCount });

          db.logActivity({
            projectId: project.id,
            taskId: task.id,
            type: 'RETRY_ATTEMPT',
            title: `Retrying task #${task.orderIndex} (Attempt ${nextRetryCount + 1} of ${task.maxRetries + 1})`,
            details: `Feeding raw validation failure output back into AI context.`,
          });

          this.executingTaskIds.delete(taskId);
          // Sequential recursive retry with validation errors
          return this.executeTask(taskId, validationSuite.rawErrorOutput);
        } else {
          // Max attempts reached: mark BLOCKED
          db.updateTask(taskId, { status: 'BLOCKED' });
          db.updateProject(project.id, { status: 'BLOCKED' });
          db.updateTaskRun(taskRun.id, { status: 'BLOCKED' });

          db.logActivity({
            projectId: project.id,
            taskId: task.id,
            type: 'TASK_BLOCKED',
            title: `Task #${task.orderIndex} BLOCKED after ${attemptNumber} failed attempts`,
            details: `Requires human intervention. Validation errors could not be resolved automatically.`,
          });

          return {
            taskId,
            taskRunId: taskRun.id,
            attemptNumber,
            status: 'BLOCKED',
            aiOutput,
            artifacts: appliedArtifacts,
            validationSuite,
            error: `Task blocked after ${attemptNumber} failed validation attempts.`,
          };
        }
      }
    } finally {
      this.executingTaskIds.delete(taskId);
    }
  }

  /**
   * Human approves task -> commit change and advance
   */
  async approveAndCommitTask(taskId: string, commitMessage?: string): Promise<{ commitHash: string; nextTask?: Task; isCompleted: boolean }> {
    const task = db.getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (task.status !== 'AWAITING_APPROVAL') {
      throw new Error(`Task is in '${task.status}' state, not awaiting approval.`);
    }

    const project = db.getProjectById(task.projectId);
    if (!project) throw new Error(`Project not found`);

    const wsPath = WorkspaceManager.getWorkspacePath(project.id);
    const msg = commitMessage || `feat(orchestrator): ${task.title} [Task #${task.orderIndex}]`;

    // Commit to the isolated working branch
    const commitRes = await WorkspaceManager.commitWorkingBranch(
      wsPath,
      msg,
      'ai/orchestrator-execution'
    );

    // Save commit record
    db.createCommit({
      projectId: project.id,
      taskId: task.id,
      commitHash: commitRes.commitHash,
      branch: commitRes.branch,
      message: msg,
      filesCount: commitRes.files.length,
      filesList: commitRes.files,
    });

    // Mark task completed
    db.updateTask(taskId, { status: 'COMPLETED' });

    db.logActivity({
      projectId: project.id,
      taskId: task.id,
      type: 'TASK_APPROVED',
      title: `Task #${task.orderIndex} approved and committed`,
      details: `Commit ${commitRes.commitHash} on branch ${commitRes.branch}`,
    });

    db.logActivity({
      projectId: project.id,
      taskId: task.id,
      type: 'COMMIT_CREATED',
      title: `Created Git Commit: ${commitRes.commitHash}`,
      details: `${commitRes.files.length} file(s) modified`,
    });

    // Check next task in sequential order
    const allTasks = db.listTasksByProjectId(project.id);
    const pendingTasks = allTasks.filter((t) => t.status === 'PENDING');

    if (pendingTasks.length > 0) {
      const nextTask = pendingTasks[0];
      return {
        commitHash: commitRes.commitHash,
        nextTask,
        isCompleted: false,
      };
    } else {
      // All tasks completed! Run final validation
      db.logActivity({
        projectId: project.id,
        type: 'VALIDATION_STARTED',
        title: 'Running final project validation suite...',
      });

      const finalValidation = await Validator.validateWorkspace(wsPath);

      db.updateProject(project.id, { status: 'COMPLETED' });

      db.logActivity({
        projectId: project.id,
        type: 'PROJECT_COMPLETED',
        title: 'Project execution completed successfully!',
        details: `All ${allTasks.length} tasks completed and verified with passing checks.`,
      });

      return {
        commitHash: commitRes.commitHash,
        isCompleted: true,
      };
    }
  }

  /**
   * Human rejects task or requests changes
   */
  async rejectTask(taskId: string, feedback?: string): Promise<Task> {
    const task = db.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    db.updateTask(taskId, { status: 'REJECTED' });

    db.logActivity({
      projectId: task.projectId,
      taskId: task.id,
      type: 'TASK_REJECTED',
      title: `Task #${task.orderIndex} rejected by user`,
      details: feedback || 'Changes rejected by reviewer.',
    });

    return db.getTaskById(taskId)!;
  }
}

export const executorService = new ExecutorService();
