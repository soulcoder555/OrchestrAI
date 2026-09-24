import { Router } from 'express';
import { db } from '../db/storage.js';
import { AuthenticatedRequest, requireAuth } from '../auth/auth.js';
import { GitHubService } from '../services/github-service.js';
import { RepoScanner } from '../services/repo-scanner.js';
import { WorkspaceManager } from '../services/workspace-manager.js';

export const repoRouter = Router();
repoRouter.use(requireAuth);

/**
 * Connect repository: can be a GitHub URL, or shorthand, or a pre-seeded demo microservice
 */
repoRouter.post('/:projectId/connect', async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const project = db.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const { repoUrl, isDemo, githubToken } = req.body;

    let owner = 'demo-org';
    let repoName = 'auth-security-service';
    let githubUrl = 'https://github.com/demo-org/auth-security-service';
    let defaultBranch = 'main';

    if (isDemo) {
      // Seed rich demo TypeScript microservice
      await GitHubService.seedDemoWorkspace(projectId);
    } else if (repoUrl) {
      const parsed = GitHubService.parseRepoString(repoUrl);
      if (!parsed) {
        return res.status(400).json({ error: "Invalid GitHub repository format. Use 'owner/repo' or 'https://github.com/owner/repo'." });
      }
      owner = parsed.owner;
      repoName = parsed.repo;
      githubUrl = `https://github.com/${owner}/${repoName}`;

      try {
        const meta = await GitHubService.fetchRepoMetadata(owner, repoName, githubToken);
        defaultBranch = meta.defaultBranch;
      } catch (err: any) {
        // If GitHub fetch fails (e.g. rate limit without token), still allow connecting with default 'main'
        console.warn('GitHub metadata fetch warning:', err.message);
      }

      await WorkspaceManager.initWorkspace(projectId, defaultBranch, 'ai/orchestrator-execution');
    } else {
      return res.status(400).json({ error: 'repoUrl or isDemo is required' });
    }

    // Save repository
    const repository = db.upsertRepository({
      projectId,
      owner,
      repoName,
      githubUrl,
      defaultBranch,
      workingBranch: 'ai/orchestrator-execution',
      isLocalDemo: !!isDemo,
      repoMapJson: null,
      scannedAt: null,
    });

    db.updateProject(projectId, {
      defaultBranch,
      activeBranch: 'ai/orchestrator-execution',
      status: 'SCANNING',
    });

    db.logActivity({
      projectId,
      type: 'REPO_SCANNED',
      title: `Connected repository: ${owner}/${repoName}`,
      details: isDemo ? 'Initialized local interactive demo workspace' : `Target branch: ${defaultBranch}`,
    });

    return res.json({ repository });
  } catch (err: any) {
    console.error('Repo connect error:', err);
    return res.status(500).json({ error: err.message || 'Failed to connect repository' });
  }
});

/**
 * Scan repository: builds cheap, lightweight repo map
 */
repoRouter.post('/:projectId/scan', async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = req.params;
    const project = db.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user!.id) return res.status(403).json({ error: 'Access denied' });

    const repo = db.getRepositoryByProjectId(projectId);
    if (!repo) return res.status(400).json({ error: 'No repository connected yet.' });

    const wsPath = WorkspaceManager.getWorkspacePath(projectId);

    // Perform lightweight scan
    const repoMap = await RepoScanner.scanDirectory(wsPath);

    // Save scan to repository
    const updatedRepo = db.upsertRepository({
      ...repo,
      repoMapJson: JSON.stringify(repoMap),
      scannedAt: new Date().toISOString(),
    });

    // Save detected facts
    db.upsertFact(projectId, 'tech_stack', 'language', repoMap.detectedLanguage);
    db.upsertFact(projectId, 'tech_stack', 'framework', repoMap.detectedFramework);
    if (repoMap.availableScripts.lint) db.upsertFact(projectId, 'validation', 'lint_command', repoMap.availableScripts.lint);
    if (repoMap.availableScripts.typecheck) db.upsertFact(projectId, 'validation', 'typecheck_command', repoMap.availableScripts.typecheck);
    if (repoMap.availableScripts.test) db.upsertFact(projectId, 'validation', 'test_command', repoMap.availableScripts.test);

    // Transition project to READY
    db.updateProject(projectId, { status: 'READY' });

    db.logActivity({
      projectId,
      type: 'REPO_SCANNED',
      title: `Repository scanned (${repoMap.files.length} files detected)`,
      details: `Language: ${repoMap.detectedLanguage} | Framework: ${repoMap.detectedFramework}`,
    });

    return res.json({ repository: updatedRepo, repoMap });
  } catch (err: any) {
    console.error('Repo scan error:', err);
    return res.status(500).json({ error: err.message || 'Failed to scan repository' });
  }
});
