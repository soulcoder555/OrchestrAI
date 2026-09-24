import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const WORKSPACES_BASE = path.resolve(process.cwd(), '.workspaces');

export interface ApplyFileResult {
  filePath: string;
  originalContent: string | null;
  modifiedContent: string | null;
  changeType: 'CREATE' | 'MODIFY' | 'DELETE';
  diffPatch: string;
}

export class WorkspaceManager {
  static getWorkspacePath(projectId: string): string {
    return path.join(WORKSPACES_BASE, projectId);
  }

  /**
   * Ensure an isolated workspace directory exists and has a git working branch.
   */
  static async initWorkspace(projectId: string, defaultBranch = 'main', workingBranch = 'ai/orchestrator-execution'): Promise<string> {
    const wsPath = this.getWorkspacePath(projectId);
    if (!fs.existsSync(wsPath)) {
      fs.mkdirSync(wsPath, { recursive: true });
    }

    // Check if git is initialized
    const gitDir = path.join(wsPath, '.git');
    if (!fs.existsSync(gitDir)) {
      try {
        await execFileAsync('git', ['init', '-b', defaultBranch], { cwd: wsPath });
        await execFileAsync('git', ['config', 'user.name', 'AI Project Orchestrator'], { cwd: wsPath });
        await execFileAsync('git', ['config', 'user.email', 'orchestrator@ai-build.local'], { cwd: wsPath });
      } catch (err) {
        console.warn('Git init fallback:', err);
      }
    }

    // Ensure working branch exists and is checked out
    try {
      const { stdout: branches } = await execFileAsync('git', ['branch', '--list', workingBranch], { cwd: wsPath });
      if (branches.trim().length > 0) {
        await execFileAsync('git', ['checkout', workingBranch], { cwd: wsPath });
      } else {
        await execFileAsync('git', ['checkout', '-b', workingBranch], { cwd: wsPath });
      }
    } catch (e) {
      // Ignore initial branch checkout errors if no commits yet
    }

    return wsPath;
  }

  /**
   * Validates target path against directory traversal.
   * Throws error if path attempts to escape the isolated workspace.
   */
  static resolveSafePath(workspacePath: string, relativePath: string): string {
    // Strip leading slashes
    const normalized = relativePath.replace(/^(\/|\\)+/, '');
    const resolved = path.resolve(workspacePath, normalized);

    if (!resolved.startsWith(workspacePath + path.sep) && resolved !== workspacePath) {
      throw new Error(`Security Violation: Path traversal detected for '${relativePath}'`);
    }

    return resolved;
  }

  /**
   * Applies file modifications safely into the workspace.
   */
  static async applyFileChanges(
    workspacePath: string,
    changes: Array<{ filePath: string; changeType: 'create' | 'modify' | 'delete'; diffOrContent: string; explanation: string }>
  ): Promise<ApplyFileResult[]> {
    const results: ApplyFileResult[] = [];

    for (const change of changes) {
      const safeTarget = this.resolveSafePath(workspacePath, change.filePath);
      let originalContent: string | null = null;
      let modifiedContent: string | null = null;

      if (fs.existsSync(safeTarget)) {
        originalContent = fs.readFileSync(safeTarget, 'utf-8');
      }

      if (change.changeType === 'delete') {
        if (fs.existsSync(safeTarget)) {
          fs.unlinkSync(safeTarget);
        }
        modifiedContent = null;
      } else {
        // Create or modify
        const dir = path.dirname(safeTarget);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // The model output provides the complete replacement/updated content in diffOrContent
        modifiedContent = change.diffOrContent;
        fs.writeFileSync(safeTarget, modifiedContent, 'utf-8');
      }

      // Generate a clean unified diff for the change
      const diffPatch = this.generateUnifiedDiff(
        change.filePath,
        originalContent || '',
        modifiedContent || ''
      );

      results.push({
        filePath: change.filePath,
        originalContent,
        modifiedContent,
        changeType: change.changeType.toUpperCase() as any,
        diffPatch,
      });
    }

    return results;
  }

  /**
   * Generates a readable unified diff between original and modified text.
   */
  static generateUnifiedDiff(filePath: string, originalText: string, modifiedText: string): string {
    const origLines = originalText ? originalText.split('\n') : [];
    const modLines = modifiedText ? modifiedText.split('\n') : [];

    const patchLines: string[] = [
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -1,${origLines.length || 1} +1,${modLines.length || 1} @@`,
    ];

    if (!originalText && modifiedText) {
      for (const l of modLines) {
        patchLines.push(`+${l}`);
      }
    } else if (originalText && !modifiedText) {
      for (const l of origLines) {
        patchLines.push(`-${l}`);
      }
    } else {
      // Simple line-by-line diff
      const maxLen = Math.max(origLines.length, modLines.length);
      for (let i = 0; i < maxLen; i++) {
        const o = origLines[i];
        const m = modLines[i];
        if (o === m) {
          if (o !== undefined) patchLines.push(` ${o}`);
        } else {
          if (o !== undefined) patchLines.push(`-${o}`);
          if (m !== undefined) patchLines.push(`+${m}`);
        }
      }
    }

    return patchLines.join('\n');
  }

  /**
   * Commits approved changes to the working branch.
   */
  static async commitWorkingBranch(
    workspacePath: string,
    message: string,
    workingBranch = 'ai/orchestrator-execution'
  ): Promise<{ commitHash: string; branch: string; files: string[] }> {
    await execFileAsync('git', ['add', '-A'], { cwd: workspacePath });

    // Check status
    const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain'], { cwd: workspacePath });
    const changedFiles = statusOut
      .trim()
      .split('\n')
      .map((line) => line.trim().replace(/^[A-Z?]{1,2}\s+/, ''))
      .filter(Boolean);

    if (changedFiles.length === 0) {
      // Nothing staged, return head
      try {
        const { stdout: headOut } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: workspacePath });
        return { commitHash: headOut.trim().slice(0, 7), branch: workingBranch, files: [] };
      } catch (e) {
        return { commitHash: '0000000', branch: workingBranch, files: [] };
      }
    }

    await execFileAsync('git', ['commit', '-m', message], { cwd: workspacePath });
    const { stdout: hashOut } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: workspacePath });

    return {
      commitHash: hashOut.trim().slice(0, 7),
      branch: workingBranch,
      files: changedFiles,
    };
  }
}
