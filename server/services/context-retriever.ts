import fs from 'fs';
import path from 'path';
import { RepoScanner } from './repo-scanner.js';
import { db } from '../db/storage.js';

export interface RetrievedContext {
  files: Array<{ path: string; content: string }>;
  projectFacts: Array<{ category: string; key: string; value: string }>;
  packageScripts?: Record<string, string>;
  techStack: string;
}

export class ContextRetriever {
  /**
   * Bounded context retrieval for a specific task
   */
  static async getContextForTask(
    workspacePath: string,
    projectId: string,
    taskTitle: string,
    taskDescription: string
  ): Promise<RetrievedContext> {
    const projectFacts = db.getFactsByProjectId(projectId);
    const repo = db.getRepositoryByProjectId(projectId);

    // Collect keywords from task title and description
    const textToAnalyze = `${taskTitle} ${taskDescription}`.toLowerCase();
    const keywords = Array.from(
      new Set(
        textToAnalyze
          .replace(/[^a-z0-9_\-\.\/]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !['the', 'and', 'for', 'with', 'add', 'make', 'update'].includes(w))
      )
    );

    // List all files in workspace
    const allFiles: string[] = [];
    const walk = (dir: string, prefix = '') => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', '.data', 'coverage'].includes(entry.name)) {
            walk(path.join(dir, entry.name), path.join(prefix, entry.name));
          }
        } else if (entry.isFile()) {
          allFiles.push(path.join(prefix, entry.name));
        }
      }
    };
    walk(workspacePath);

    // Score files based on path relevance and keywords
    const scoredFiles: Array<{ file: string; score: number }> = [];

    for (const file of allFiles) {
      const lowerFile = file.toLowerCase();
      let score = 0;

      // Direct filename mentioned in task
      const baseName = path.basename(lowerFile);
      if (textToAnalyze.includes(baseName)) {
        score += 50;
      }

      // Keyword matches in file path
      for (const kw of keywords) {
        if (lowerFile.includes(kw)) {
          score += 15;
        }
      }

      // Common source files have higher priority than configs unless config is mentioned
      if (lowerFile.startsWith('src/') || lowerFile.startsWith('app/') || lowerFile.startsWith('test/')) {
        score += 5;
      }

      // Read a tiny snippet of file content to check for keyword matches
      try {
        const fullPath = path.join(workspacePath, file);
        const stat = fs.statSync(fullPath);
        if (stat.size < 100 * 1024) {
          // only check if < 100KB
          const contentSnippet = fs.readFileSync(fullPath, 'utf-8').slice(0, 2000).toLowerCase();
          for (const kw of keywords) {
            if (contentSnippet.includes(kw)) {
              score += 4;
            }
          }
        }
      } catch (e) {
        // ignore read error
      }

      if (score > 0) {
        scoredFiles.push({ file, score });
      }
    }

    // Sort by score descending and take up to 4 most relevant files
    scoredFiles.sort((a, b) => b.score - a.score);
    const selectedFilePaths = scoredFiles.slice(0, 4).map((s) => s.file);

    // Always include package.json if it exists and wasn't already selected
    if (allFiles.includes('package.json') && !selectedFilePaths.includes('package.json') && selectedFilePaths.length < 5) {
      selectedFilePaths.push('package.json');
    }

    // Read sanitized file contents
    const filesContent: Array<{ path: string; content: string }> = [];
    for (const relPath of selectedFilePaths) {
      try {
        const fullPath = path.join(workspacePath, relPath);
        if (fs.existsSync(fullPath)) {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          // Bound size to 4500 chars
          const bounded = raw.length > 4500 ? raw.slice(0, 4500) + '\n// ... [truncated for context window]' : raw;
          filesContent.push({
            path: relPath,
            content: RepoScanner.sanitizeFileContent(relPath, bounded),
          });
        }
      } catch (err) {
        console.warn(`Could not read file for context: ${relPath}`, err);
      }
    }

    // Extract package scripts
    let packageScripts: Record<string, string> | undefined = undefined;
    const pkgPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        packageScripts = pkg.scripts;
      } catch (e) {}
    }

    let techStack = 'TypeScript / Node.js';
    if (repo?.repoMapJson) {
      try {
        const map = JSON.parse(repo.repoMapJson);
        techStack = `${map.detectedLanguage || 'TypeScript'} (${map.detectedFramework || 'Node.js'})`;
      } catch (e) {}
    }

    return {
      files: filesContent,
      projectFacts: projectFacts.map((f) => ({
        category: f.category,
        key: f.key,
        value: f.value,
      })),
      packageScripts,
      techStack,
    };
  }
}
